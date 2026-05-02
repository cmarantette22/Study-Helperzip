import { pgTable, serial, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { marketplaceListingsTable } from "./marketplace-listings";

export const marketplacePurchasesTable = pgTable("marketplace_purchases", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
  buyerUserId: integer("buyer_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  copiedProjectId: integer("copied_project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  purchasePriceCents: integer("purchase_price_cents").notNull().default(0),
  commissionCents: integer("commission_cents").notNull().default(0),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  updateAvailable: boolean("update_available").notNull().default(false),
  updateDismissed: boolean("update_dismissed").notNull().default(false),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
});

export type MarketplacePurchase = typeof marketplacePurchasesTable.$inferSelect;
