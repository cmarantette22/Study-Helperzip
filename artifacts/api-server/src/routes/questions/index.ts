import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questionsTable, choicesTable } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateQuestionBody,
  ParseQuestionImageBody,
  CheckAnswerBody,
  ChatAboutQuestionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/questions", async (_req, res) => {
  const questions = await db
    .select()
    .from(questionsTable)
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

  const [question] = await db
    .insert(questionsTable)
    .values({ questionText: body.questionText })
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
        content: `You are a question parser. Given an image of a multiple-choice question, extract the question text and all answer choices. Identify which answer is correct (look for check marks, filled circles, or other indicators).

Return your response as valid JSON with this exact format:
{
  "questionText": "The full question text including any context/setup",
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

  let parsed: { questionText: string; choices: { label: string; text: string; isCorrect: boolean }[] };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const [question] = await db
    .insert(questionsTable)
    .values({ questionText: parsed.questionText })
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

router.get("/questions/stats", async (_req, res) => {
  const totalResult = await db.select({ value: count() }).from(questionsTable);
  const answeredResult = await db
    .select({ value: count() })
    .from(questionsTable)
    .where(eq(questionsTable.answered, true));
  const correctResult = await db
    .select({ value: count() })
    .from(questionsTable)
    .where(eq(questionsTable.answeredCorrectly, true));

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

  res.json({ reply });
});

export default router;
