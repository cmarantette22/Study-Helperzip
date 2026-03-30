import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  answered: boolean("answered").notNull().default(false),
  answeredCorrectly: boolean("answered_correctly"),
  multiSelect: boolean("multi_select").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
