import { pgTable, serial, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sellerUserId: integer("seller_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  priceCents: integer("price_cents").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;

export const marketplaceTerms = ["Fall", "Spring", "Summer", "Winter", "Full Year"] as const;
export type MarketplaceTerm = typeof marketplaceTerms[number];
