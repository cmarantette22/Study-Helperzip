import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { outlineSectionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  UploadOutlineBody,
  ChatAboutSectionBody,
} from "@workspace/api-zod";
import { extractText } from "unpdf";

const router: IRouter = Router();

router.get("/projects/:id/outline", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const sections = await db
    .select()
    .from(outlineSectionsTable)
    .where(eq(outlineSectionsTable.projectId, projectId))
    .orderBy(outlineSectionsTable.orderIndex);
  res.json(sections);
});

router.post("/projects/:id/outline", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const body = UploadOutlineBody.parse(req.body);

  let outlineText = body.text ?? "";

  if (body.pdfBase64 && !outlineText) {
    const pdfBuffer = Buffer.from(body.pdfBase64, "base64");
    const { text: extracted } = await extractText(new Uint8Array(pdfBuffer));
    outlineText = extracted;
  }

  if (!outlineText.trim()) {
    res.status(400).json({ error: "No outline text provided" });
    return;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are a course outline parser. Given a course outline or syllabus text, break it down into distinct sections/topics. Each section should represent a meaningful unit of study (e.g., a chapter, module, topic, or lecture).

Return your response as valid JSON with this exact format:
{
  "sections": [
    {
      "title": "Section title or topic name",
      "content": "The full content/description of what this section covers, including subtopics, key terms, learning objectives, and any details from the outline"
    }
  ]
}

Guidelines:
- Extract ALL sections from the outline
- Keep the original structure and hierarchy
- Include subtopics within their parent section's content
- If a section has bullet points or sub-items, include them in the content
- Preserve any specific terms, concepts, or vocabulary mentioned
- Return ONLY the JSON, no markdown code fences or other text`,
      },
      {
        role: "user",
        content: outlineText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to parse outline" });
    return;
  }

  let parsed: { sections: { title: string; content: string }[] };
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  await db.delete(outlineSectionsTable).where(eq(outlineSectionsTable.projectId, projectId));

  const insertedSections = [];
  for (let i = 0; i < parsed.sections.length; i++) {
    const section = parsed.sections[i];
    const [inserted] = await db
      .insert(outlineSectionsTable)
      .values({
        projectId,
        title: section.title,
        content: section.content,
        orderIndex: i,
      })
      .returning();
    insertedSections.push(inserted);
  }

  res.json(insertedSections);
});

router.delete("/projects/:id/outline", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  await db.delete(outlineSectionsTable).where(eq(outlineSectionsTable.projectId, projectId));
  res.status(204).send();
});

router.delete("/projects/:id/outline/:sectionId", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const sectionId = parseInt(req.params.sectionId, 10);

  const [section] = await db
    .select()
    .from(outlineSectionsTable)
    .where(and(eq(outlineSectionsTable.id, sectionId), eq(outlineSectionsTable.projectId, projectId)));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  await db.delete(outlineSectionsTable).where(eq(outlineSectionsTable.id, sectionId));
  res.status(204).send();
});

router.post("/projects/:id/outline/:sectionId/deep-explain", async (req, res) => {
  const sectionId = parseInt(req.params.sectionId, 10);
  const projectId = parseInt(req.params.id, 10);

  const [section] = await db
    .select()
    .from(outlineSectionsTable)
    .where(and(eq(outlineSectionsTable.id, sectionId), eq(outlineSectionsTable.projectId, projectId)));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert tutor and subject matter expert. Given a course outline section title and its content, provide an in-depth analysis of the primary principles, theories, and concepts covered in this section. Go beyond surface-level — explain the foundational knowledge a student needs to truly understand these topics.

Return your response as valid JSON with this exact format:
{
  "principles": [
    {
      "name": "Name of the principle or concept",
      "description": "A thorough explanation of this principle — what it is, why it matters, and how it works in general",
      "howItApplies": "How this principle specifically relates to the topics in this section, with examples and connections to real-world applications"
    }
  ],
  "summary": "A 2-3 sentence synthesis tying all the principles together and explaining why understanding them is important for mastering this section"
}

Important: Return ONLY the JSON, no markdown code fences or other text. Include 3-6 key principles depending on the section's breadth.`,
      },
      {
        role: "user",
        content: `Section: ${section.title}\n\nContent: ${section.content}`,
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

router.post("/projects/:id/outline/:sectionId/chat", async (req, res) => {
  const sectionId = parseInt(req.params.sectionId, 10);
  const projectId = parseInt(req.params.id, 10);
  const body = ChatAboutSectionBody.parse(req.body);

  const [section] = await db
    .select()
    .from(outlineSectionsTable)
    .where(and(eq(outlineSectionsTable.id, sectionId), eq(outlineSectionsTable.projectId, projectId)));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

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
        content: `You are a patient, encouraging expert tutor helping a student understand course material. Here is the context:

Section: ${section.title}

Content: ${section.content}

The student may ask follow-up questions, express confusion, or ask you to explain things differently. Your job is to:
- Answer their specific question or concern
- Use analogies, examples, and simple language when helpful
- Break down complex ideas into digestible pieces
- Be encouraging and supportive
- Stay focused on the section's topics and underlying concepts
- If they say they don't understand, try explaining from a different angle
- Provide concrete examples when possible

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
