import type Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db } from "@workspace/db";
import {
  marketplaceListingsTable,
  marketplacePurchasesTable,
  projectsTable,
  questionsTable,
  choicesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const COMMISSION_RATE = 0.15;

async function handleMarketplacePurchaseComplete(session: Stripe.Checkout.Session): Promise<void> {
  const listingId = parseInt(session.metadata?.listingId ?? "", 10);
  const buyerUserId = parseInt(session.metadata?.buyerUserId ?? "", 10);
  const purchaseId = parseInt(session.metadata?.purchaseId ?? "", 10);

  if (isNaN(listingId) || isNaN(buyerUserId)) {
    return;
  }

  // Prefer lookup by purchaseId when available (set at checkout creation time)
  let existing: typeof marketplacePurchasesTable.$inferSelect | undefined;
  if (!isNaN(purchaseId)) {
    const [row] = await db
      .select()
      .from(marketplacePurchasesTable)
      .where(eq(marketplacePurchasesTable.id, purchaseId));
    existing = row;
  } else {
    const [row] = await db
      .select()
      .from(marketplacePurchasesTable)
      .where(
        and(
          eq(marketplacePurchasesTable.listingId, listingId),
          eq(marketplacePurchasesTable.buyerUserId, buyerUserId)
        )
      );
    existing = row;
  }

  if (existing?.copiedProjectId) {
    return;
  }

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, listingId));

  if (!listing) return;

  const [sourceProject] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, listing.projectId));

  if (!sourceProject) return;

  const [seller] = await db
    .select({ handle: usersTable.handle })
    .from(usersTable)
    .where(eq(usersTable.id, listing.sellerUserId));

  const [copiedProject] = await db
    .insert(projectsTable)
    .values({
      name: sourceProject.name,
      userId: buyerUserId,
      course: sourceProject.course,
      term: sourceProject.term,
      year: sourceProject.year,
      school: sourceProject.school,
      description: sourceProject.description,
      isMarketplaceCopy: true,
      sourceOwnerHandle: seller?.handle ?? null,
      sourceListingId: listing.id,
    })
    .returning();

  const sourceQuestions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.projectId, sourceProject.id));

  for (const q of sourceQuestions) {
    const [newQ] = await db
      .insert(questionsTable)
      .values({
        projectId: copiedProject.id,
        questionText: q.questionText,
        multiSelect: q.multiSelect,
        answered: false,
        answeredCorrectly: null,
        explanations: null,
        deepExplanation: null,
        chatMessages: null,
      })
      .returning();

    const sourceChoices = await db
      .select()
      .from(choicesTable)
      .where(eq(choicesTable.questionId, q.id));

    for (const c of sourceChoices) {
      await db.insert(choicesTable).values({
        questionId: newQ.id,
        label: c.label,
        text: c.text,
        isCorrect: c.isCorrect,
      });
    }
  }

  const commissionCents = Math.round(listing.priceCents * COMMISSION_RATE);
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  if (existing) {
    await db
      .update(marketplacePurchasesTable)
      .set({
        copiedProjectId: copiedProject.id,
        stripePaymentIntentId: paymentIntentId,
        commissionCents,
        purchasePriceCents: listing.priceCents,
      })
      .where(eq(marketplacePurchasesTable.id, existing.id));
  } else {
    await db.insert(marketplacePurchasesTable).values({
      listingId: listing.id,
      buyerUserId,
      copiedProjectId: copiedProject.id,
      purchasePriceCents: listing.priceCents,
      commissionCents,
      stripePaymentIntentId: paymentIntentId,
    });
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "This usually means express.json() parsed the body before reaching this handler. " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "marketplace") {
        await handleMarketplacePurchaseComplete(session);
      }
    }
  }
}
