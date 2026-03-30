import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const outlineSectionsTable = pgTable("outline_sections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOutlineSectionSchema = createInsertSchema(outlineSectionsTable).omit({ id: true, createdAt: true });
export type InsertOutlineSection = z.infer<typeof insertOutlineSectionSchema>;
export type OutlineSection = typeof outlineSectionsTable.$inferSelect;
