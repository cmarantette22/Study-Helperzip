import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questionsTable, choicesTable, projectsTable } from "@workspace/db/schema";
import { eq, sql, count, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateQuestionBody,
  UpdateQuestionBody,
  ParseQuestionImageBody,
  ParsePdfQuestionsBody,
  CheckAnswerBody,
  ChatAboutQuestionBody,
} from "@workspace/api-zod";
import { extractText } from "unpdf";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/questions", async (req, res) => {
  const user = (req as any).currentUser;

  const userProjects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id));

  const projectIds = userProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(inArray(questionsTable.projectId, projectIds))
    .orderBy(sql`${questionsTable.createdAt} DESC`);

  const questionIds = questions.map((q) => q.id);
  let choices: (typeof choicesTable.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    choices = await db
      .select()
      .from(choicesTable)
      .where(sql`${choicesTable.questionId} IN (${sql.join(questionIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const result = questions.map((q) => ({
    ...q,
    choices: choices.filter((c) => c.questionId === q.id),
  }));

  res.json(result);
});

router.post("/questions", async (req, res) => {
  const body = CreateQuestionBody.parse(req.body);

  const multiSelect = body.multiSelect ?? /check all that apply|select all that apply/i.test(body.questionText);
  const [question] = await db
    .insert(questionsTable)
    .values({ questionText: body.questionText, projectId: body.projectId ?? null, multiSelect })
    .returning();

  const choiceValues = body.choices.map((c: { label: string; text: string; isCorrect: boolean }) => ({
    questionId: question.id,
    label: c.label,
    text: c.text,
    isCorrect: c.isCorrect,
  }));

  const insertedChoices = await db
    .insert(choicesTable)
    .values(choiceValues)
    .returning();

  res.status(201).json({ ...question, choices: insertedChoices });
});

router.post("/questions/parse-image", async (req, res) => {
  const body = ParseQuestionImageBody.parse(req.body);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are a question parser. Given an image of a multiple-choice question, extract the question text and all answer choices. Identify which answer(s) are correct (look for check marks, filled circles, or other indicators).

If the question says "Check all that apply", "Select all that apply", or otherwise indicates multiple correct answers, set "multiSelect" to true and mark ALL correct choices with "isCorrect": true. Otherwise set "multiSelect" to false and mark only one correct choice.

Return your response as valid JSON with this exact format:
{
  "questionText": "The full question text including any context/setup",
  "multiSelect": false,
  "choices": [
    { "label": "A", "text": "Choice text here", "isCorrect": false },
    { "label": "B", "text": "Choice text here", "isCorrect": false },
    { "label": "C", "text": "Choice text here", "isCorrect": false },
    { "label": "D", "text": "Choice text here", "isCorrect": true }
  ]
}

Important: Return ONLY the JSON, no markdown code fences or other text.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${body.imageBase64}`,
            },
          },
          {
            type: "text",
            text: "Parse this multiple-choice question from the image. Extract the question text and all answer choices, and identify the correct answer.",
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to parse image" });
    return;
  }

  let parsed: { questionText: string; multiSelect?: boolean; choices: { label: string; text: string; isCorrect: boolean }[] };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const multiSelect = parsed.multiSelect ?? /check all that apply|select all that apply/i.test(parsed.questionText);
  const [question] = await db
    .insert(questionsTable)
    .values({ questionText: parsed.questionText, projectId: body.projectId ?? null, multiSelect })
    .returning();

  const choiceValues = parsed.choices.map((c) => ({
    questionId: question.id,
    label: c.label,
    text: c.text,
    isCorrect: c.isCorrect,
  }));

  const insertedChoices = await db
    .insert(choicesTable)
    .values(choiceValues)
    .returning();

  res.json({ ...question, choices: insertedChoices });
});

router.post("/questions/parse-pdf", async (req, res) => {
  const body = ParsePdfQuestionsBody.parse(req.body);

  const pdfBuffer = Buffer.from(body.pdfBase64, "base64");
  const pdfUint8 = new Uint8Array(pdfBuffer);
  let pdfText: string;
  try {
    const result = await extractText(pdfUint8, { mergePages: true });
    pdfText = typeof result.text === "string" ? result.text : result.text.join("\n");
  } catch (err: any) {
    console.error("PDF parse error:", err?.message || err);
    res.status(400).json({ error: "Failed to parse PDF file" });
    return;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 16384,
    messages: [
      {
        role: "system",
        content: `You are a question parser. Given the text content of a PDF containing multiple-choice questions and an answer key, extract ALL questions with their answer choices and mark the correct answers based on the answer key.

The PDF typically has:
- Numbered questions with multiple choices (A, B, C, D)
- An answer key section (usually on the last page) that maps question numbers to correct answer letters

Your job:
1. Parse every question from the document
2. Extract the full question text (including any context, tables, or scenarios described)
3. Extract all answer choices with their labels
4. Use the answer key to determine which choice(s) are correct for each question
5. If a question says "Check all that apply", "Select all that apply", or otherwise indicates multiple correct answers, set "multiSelect" to true and mark ALL correct choices. Otherwise set "multiSelect" to false.

Return your response as valid JSON with this exact format:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Full question text here",
      "multiSelect": false,
      "choices": [
        { "label": "A", "text": "Choice A text", "isCorrect": true },
        { "label": "B", "text": "Choice B text", "isCorrect": false },
        { "label": "C", "text": "Choice C text", "isCorrect": false },
        { "label": "D", "text": "Choice D text", "isCorrect": false }
      ]
    }
  ]
}

Important rules:
- Return ONLY the JSON, no markdown code fences or other text
- Include ALL questions from the document, do not skip any
- If a question references a table or data, include that context in the questionText
- Use the answer key to correctly mark isCorrect for each choice
- Preserve the full text of each choice, including any explanations within the choice
- For "check all that apply" questions, set multiSelect to true and mark multiple isCorrect choices`,
      },
      {
        role: "user",
        content: `Here is the text content of the PDF:\n\n${pdfText}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to parse PDF questions" });
    return;
  }

  let parsed: { questions: { questionNumber: number; questionText: string; multiSelect?: boolean; choices: { label: string; text: string; isCorrect: boolean }[] }[] };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const savedQuestions = [];

  for (const q of parsed.questions) {
    const multiSelect = q.multiSelect ?? /check all that apply|select all that apply/i.test(q.questionText);
    const [question] = await db
      .insert(questionsTable)
      .values({ questionText: q.questionText, projectId: body.projectId ?? null, multiSelect })
      .returning();

    const choiceValues = q.choices.map((c) => ({
      questionId: question.id,
      label: c.label,
      text: c.text,
      isCorrect: c.isCorrect,
    }));

    const insertedChoices = await db
      .insert(choicesTable)
      .values(choiceValues)
      .returning();

    savedQuestions.push({ ...question, choices: insertedChoices });
  }

  res.json({ questions: savedQuestions, totalParsed: savedQuestions.length });
});

router.get("/questions/stats", async (req, res) => {
  const user = (req as any).currentUser;
  const projectIdParam = req.query.projectId as string | undefined;
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : null;

  let baseCondition;

  if (projectId) {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    baseCondition = eq(questionsTable.projectId, projectId);
  } else {
    const userProjects = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.userId, user.id));

    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      res.json({ totalQuestions: 0, answeredQuestions: 0, correctAnswers: 0, incorrectAnswers: 0, accuracyPercent: 0 });
      return;
    }
    baseCondition = inArray(questionsTable.projectId, projectIds);
  }

  const totalResult = await db.select({ value: count() }).from(questionsTable).where(baseCondition);
  const answeredResult = await db
    .select({ value: count() })
    .from(questionsTable)
    .where(and(baseCondition, eq(questionsTable.answered, true)));
  const correctResult = await db
    .select({ value: count() })
    .from(questionsTable)
    .where(and(baseCondition, eq(questionsTable.answeredCorrectly, true)));

  const total = totalResult[0]?.value ?? 0;
  const answered = answeredResult[0]?.value ?? 0;
  const correct = correctResult[0]?.value ?? 0;
  const incorrect = answered - correct;

  res.json({
    totalQuestions: total,
    answeredQuestions: answered,
    correctAnswers: correct,
    incorrectAnswers: incorrect,
    accuracyPercent: answered > 0 ? Math.round((correct / answered) * 100) : 0,
  });
});

router.get("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const choices = await db
    .select()
    .from(choicesTable)
    .where(eq(choicesTable.questionId, id));

  res.json({ ...question, choices });
});

router.put("/questions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = UpdateQuestionBody.parse(req.body);

    const [question] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id));

    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const multiSelect = body.multiSelect ?? /check all that apply|select all that apply/i.test(body.questionText);
    await db
      .update(questionsTable)
      .set({ questionText: body.questionText, multiSelect })
      .where(eq(questionsTable.id, id));

    await db.delete(choicesTable).where(eq(choicesTable.questionId, id));

    const choiceValues = body.choices.map((c: { label: string; text: string; isCorrect: boolean }) => ({
      questionId: id,
      label: c.label,
      text: c.text,
      isCorrect: c.isCorrect,
    }));

    const insertedChoices = await db
      .insert(choicesTable)
      .values(choiceValues)
      .returning();

    const [updated] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id));

    res.json({ ...updated, choices: insertedChoices });
  } catch (err) {
    console.error("Update question error:", err);
    res.status(500).json({ error: "Failed to update question" });
  }
});

router.delete("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.status(204).send();
});

router.post("/questions/:id/check", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = CheckAnswerBody.parse(req.body);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const choices = await db
    .select()
    .from(choicesTable)
    .where(eq(choicesTable.questionId, id));

  if (question.multiSelect) {
    if (!body.choiceIds || body.choiceIds.length === 0) {
      res.status(400).json({ error: "choiceIds is required for multi-select questions" });
      return;
    }
    const selectedIds = body.choiceIds;
    const correctIds = choices.filter((c) => c.isCorrect).map((c) => c.id);
    const selectedSet = new Set(selectedIds);
    const correctSet = new Set(correctIds);
    const isCorrect = selectedSet.size === correctSet.size && [...selectedSet].every((id) => correctSet.has(id));

    await db
      .update(questionsTable)
      .set({ answered: true, answeredCorrectly: isCorrect })
      .where(eq(questionsTable.id, id));

    res.json({
      correct: isCorrect,
      correctChoiceIds: correctIds,
      selectedChoiceIds: selectedIds,
    });
  } else {
    if (body.choiceId === undefined || body.choiceId === null) {
      res.status(400).json({ error: "choiceId is required for single-select questions" });
      return;
    }
    const correctChoice = choices.find((c) => c.isCorrect);
    const isCorrect = body.choiceId === correctChoice?.id;

    await db
      .update(questionsTable)
      .set({ answered: true, answeredCorrectly: isCorrect })
      .where(eq(questionsTable.id, id));

    res.json({
      correct: isCorrect,
      correctChoiceId: correctChoice?.id ?? 0,
      selectedChoiceId: body.choiceId,
    });
  }
});

router.post("/questions/:id/explain", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const choices = await db
    .select()
    .from(choicesTable)
    .where(eq(choicesTable.questionId, id));

  const choicesText = choices
    .map((c) => `${c.label}. ${c.text} (${c.isCorrect ? "CORRECT" : "INCORRECT"})`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert tutor. Given a multiple-choice question and its answer choices, explain why each answer choice is correct or incorrect. Be thorough but concise. Help the student understand the underlying concepts.

Return your response as valid JSON with this exact format:
{
  "explanations": [
    { "label": "A", "explanation": "Explanation for why this choice is correct/incorrect..." },
    { "label": "B", "explanation": "Explanation for why this choice is correct/incorrect..." }
  ]
}

Important: Return ONLY the JSON, no markdown code fences or other text.`,
      },
      {
        role: "user",
        content: `Question: ${question.questionText}\n\nChoices:\n${choicesText}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to generate explanations" });
    return;
  }

  let parsed: { explanations: { label: string; explanation: string }[] };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const explanations = choices.map((c) => ({
    choiceId: c.id,
    label: c.label,
    isCorrect: c.isCorrect,
    explanation:
      parsed.explanations.find((e) => e.label === c.label)?.explanation ??
      "No explanation available.",
  }));

  await db
    .update(questionsTable)
    .set({ explanations })
    .where(eq(questionsTable.id, id));

  res.json({ explanations });
});

router.post("/questions/:id/deep-explain", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const choices = await db
    .select()
    .from(choicesTable)
    .where(eq(choicesTable.questionId, id));

  const choicesText = choices
    .map((c) => `${c.label}. ${c.text} (${c.isCorrect ? "CORRECT" : "INCORRECT"})`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert tutor and subject matter expert. Given a multiple-choice question and its answer choices, provide an in-depth analysis of the primary principles, theories, and concepts that the question tests. Go beyond surface-level explanations — explain the foundational knowledge a student needs to understand this topic deeply.

Return your response as valid JSON with this exact format:
{
  "principles": [
    {
      "name": "Name of the principle or concept",
      "description": "A thorough explanation of this principle — what it is, why it matters, and how it works in general",
      "howItApplies": "How this specific principle applies to the question at hand, connecting the theory to the specific scenario"
    }
  ],
  "summary": "A 2-3 sentence synthesis tying all the principles together and explaining why the correct answer is correct at a deeper level"
}

Important: Return ONLY the JSON, no markdown code fences or other text. Include 2-4 key principles.`,
      },
      {
        role: "user",
        content: `Question: ${question.questionText}\n\nChoices:\n${choicesText}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to generate deep explanation" });
    return;
  }

  let parsed: { principles: { name: string; description: string; howItApplies: string }[]; summary: string };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  await db
    .update(questionsTable)
    .set({ deepExplanation: parsed })
    .where(eq(questionsTable.id, id));

  res.json(parsed);
});

router.post("/questions/:id/chat", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = ChatAboutQuestionBody.parse(req.body);

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, id));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const choices = await db
    .select()
    .from(choicesTable)
    .where(eq(choicesTable.questionId, id));

  const choicesText = choices
    .map((c) => `${c.label}. ${c.text} (${c.isCorrect ? "CORRECT" : "INCORRECT"})`)
    .join("\n");

  const conversationMessages: { role: "user" | "assistant"; content: string }[] =
    (body.conversationHistory ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are a patient, encouraging expert tutor helping a student understand a specific multiple-choice question. Here is the question context:

Question: ${question.questionText}

Choices:
${choicesText}

The student may ask follow-up questions, express confusion, or ask you to explain things differently. Your job is to:
- Answer their specific question or concern
- Use analogies, examples, and simple language when helpful
- Break down complex ideas into digestible pieces
- Be encouraging and supportive
- Stay focused on the question and its underlying concepts
- If they say they don't understand, try explaining from a different angle

Keep your responses clear and focused. Use plain text, not markdown formatting.`,
      },
      ...conversationMessages,
      {
        role: "user",
        content: body.message,
      },
    ],
  });

  const reply = response.choices[0]?.message?.content;
  if (!reply) {
    res.status(500).json({ error: "Failed to generate response" });
    return;
  }

  const updatedHistory = [
    ...(body.conversationHistory ?? []),
    { role: "user" as const, content: body.message },
    { role: "assistant" as const, content: reply },
  ];

  await db
    .update(questionsTable)
    .set({ chatMessages: updatedHistory })
    .where(eq(questionsTable.id, id));

  res.json({ reply });
});

export default router;
