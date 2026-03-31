import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, questionsTable, choicesTable } from "@workspace/db/schema";
import { eq, sql, count, and } from "drizzle-orm";
import {
  CreateProjectBody,
  ListProjectQuestionsParams,
  ResetProjectAnswersParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (_req, res) => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(sql`${projectsTable.createdAt} DESC`);

  res.json(projects);
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);

  const [project] = await db
    .insert(projectsTable)
    .values({ name: body.name })
    .returning();

  res.status(201).json(project);
});

router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const totalResult = await db.select({ value: count() }).from(questionsTable).where(eq(questionsTable.projectId, id));
  const answeredResult = await db.select({ value: count() }).from(questionsTable).where(and(eq(questionsTable.projectId, id), eq(questionsTable.answered, true)));
  const correctResult = await db.select({ value: count() }).from(questionsTable).where(and(eq(questionsTable.projectId, id), eq(questionsTable.answeredCorrectly, true)));

  const total = totalResult[0]?.value ?? 0;
  const answered = answeredResult[0]?.value ?? 0;
  const correct = correctResult[0]?.value ?? 0;
  const incorrect = answered - correct;

  res.json({
    ...project,
    totalQuestions: total,
    answeredQuestions: answered,
    correctAnswers: correct,
    incorrectAnswers: incorrect,
    accuracyPercent: answered > 0 ? Math.round((correct / answered) * 100) : 0,
  });
});

router.put("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = CreateProjectBody.parse(req.body);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [updated] = await db
    .update(projectsTable)
    .set({ name: body.name })
    .where(eq(projectsTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

router.get("/projects/:id/questions", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const filter = (req.query.filter as string) || "all";

  let conditions = [eq(questionsTable.projectId, id)];

  if (filter === "correct") {
    conditions.push(eq(questionsTable.answered, true));
    conditions.push(eq(questionsTable.answeredCorrectly, true));
  } else if (filter === "needs_review") {
    conditions.push(eq(questionsTable.answered, true));
    conditions.push(eq(questionsTable.answeredCorrectly, false));
  } else if (filter === "unanswered") {
    conditions.push(eq(questionsTable.answered, false));
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(and(...conditions))
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

router.post("/projects/:id/delete-questions", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const result = await db
    .delete(questionsTable)
    .where(eq(questionsTable.projectId, id))
    .returning();

  res.json({ deletedCount: result.length });
});

router.post("/projects/:id/reset", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const filter = (req.query.filter as string) || "all";

  let conditions = [eq(questionsTable.projectId, id), eq(questionsTable.answered, true)];

  if (filter === "correct") {
    conditions.push(eq(questionsTable.answeredCorrectly, true));
  } else if (filter === "needs_review") {
    conditions.push(eq(questionsTable.answeredCorrectly, false));
  }

  const result = await db
    .update(questionsTable)
    .set({ answered: false, answeredCorrectly: null, explanations: null, deepExplanation: null, chatMessages: null })
    .where(and(...conditions))
    .returning();

  res.json({ resetCount: result.length });
});

export default router;
