import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { questionsTable } from "./questions";

export const choicesTable = pgTable("choices", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
});

export const insertChoiceSchema = createInsertSchema(choicesTable).omit({ id: true });
export type InsertChoice = z.infer<typeof insertChoiceSchema>;
export type Choice = typeof choicesTable.$inferSelect;
