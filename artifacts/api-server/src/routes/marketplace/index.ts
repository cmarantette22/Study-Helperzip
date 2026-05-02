import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  questionsTable,
  choicesTable,
  marketplaceListingsTable,
  marketplacePurchasesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { getUncachableStripeClient } from "../../stripeClient";
import { z } from "zod";

type DbProject = InferSelectModel<typeof projectsTable>;
type DbListing = InferSelectModel<typeof marketplaceListingsTable>;
type DbPurchase = InferSelectModel<typeof marketplacePurchasesTable>;
type DbUser = InferSelectModel<typeof usersTable>;
type SellerInfo = { handle: string | null; name: string | null };

interface AuthedRequest extends Request {
  currentUser: DbUser;
}

const router: IRouter = Router();

router.use(requireAuth);

const COMMISSION_RATE = 0.15;

const CreateListingBody = z.object({
  projectId: z.number().int().positive(),
  priceCents: z.number().int().min(0),
  isActive: z.boolean().optional().default(true),
  course: z.string().optional(),
  term: z.string().optional(),
  year: z.number().int().optional(),
  school: z.string().optional(),
  description: z.string().optional(),
});

const UpdateListingBody = z.object({
  priceCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  course: z.string().optional(),
  term: z.string().optional(),
  year: z.number().int().optional(),
  school: z.string().optional(),
  description: z.string().optional(),
});

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as unknown as AuthedRequest).currentUser;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

function buildListingResponse(
  listing: DbListing,
  project: DbProject,
  seller: SellerInfo | null,
  holderCount: number,
  myPurchase?: DbPurchase | null
) {
  return {
    id: listing.id,
    projectId: listing.projectId,
    sellerUserId: listing.sellerUserId,
    sellerHandle: seller?.handle ?? null,
    sellerName: seller?.name ?? null,
    priceCents: listing.priceCents,
    isActive: listing.isActive,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    holderCount,
    project: {
      id: project.id,
      name: project.name,
      course: project.course,
      term: project.term,
      year: project.year,
      school: project.school,
      description: project.description,
    },
    myPurchase: myPurchase ?? null,
  };
}

router.get("/marketplace", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;

  const listings = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.isActive, true))
    .orderBy(desc(marketplaceListingsTable.createdAt));

  const results = await Promise.all(
    listings.map(async (listing) => {
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, listing.projectId));

      if (!project) return null;

      const [seller] = await db
        .select({ handle: usersTable.handle, name: usersTable.name, subscriptionStatus: usersTable.subscriptionStatus, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, listing.sellerUserId));

      if (!seller || (seller.subscriptionStatus !== "active" && seller.role !== "admin")) return null;

      const [holderResult] = await db
        .select({ value: count() })
        .from(marketplacePurchasesTable)
        .where(eq(marketplacePurchasesTable.listingId, listing.id));

      const [myPurchase] = await db
        .select()
        .from(marketplacePurchasesTable)
        .where(
          and(
            eq(marketplacePurchasesTable.listingId, listing.id),
            eq(marketplacePurchasesTable.buyerUserId, user.id)
          )
        );

      return buildListingResponse(
        listing,
        project,
        seller,
        holderResult?.value ?? 0,
        myPurchase ?? null
      );
    })
  );

  res.json(results.filter(Boolean));
});

router.get("/marketplace/my-listings", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;

  const listings = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.sellerUserId, user.id))
    .orderBy(desc(marketplaceListingsTable.createdAt));

  const results = await Promise.all(
    listings.map(async (listing) => {
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, listing.projectId));

      if (!project) return null;

      const [holderResult] = await db
        .select({ value: count() })
        .from(marketplacePurchasesTable)
        .where(eq(marketplacePurchasesTable.listingId, listing.id));

      return buildListingResponse(
        listing,
        project,
        { handle: user.handle, name: user.name },
        holderResult?.value ?? 0
      );
    })
  );

  res.json(results.filter(Boolean));
});

router.get("/marketplace/my-purchases", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;

  const purchases = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(eq(marketplacePurchasesTable.buyerUserId, user.id))
    .orderBy(desc(marketplacePurchasesTable.purchasedAt));

  const results = await Promise.all(
    purchases.map(async (purchase) => {
      const [listing] = await db
        .select()
        .from(marketplaceListingsTable)
        .where(eq(marketplaceListingsTable.id, purchase.listingId));
      if (!listing) return null;

      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, listing.projectId));

      return {
        ...purchase,
        listing: listing ? { id: listing.id, priceCents: listing.priceCents, isActive: listing.isActive } : null,
        originalProjectName: project?.name ?? null,
      };
    })
  );

  res.json(results.filter(Boolean));
});

router.get("/marketplace/:id", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, listing.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [seller] = await db
    .select({ handle: usersTable.handle, name: usersTable.name, subscriptionStatus: usersTable.subscriptionStatus, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, listing.sellerUserId));

  if (!seller || (!listing.isActive && user.id !== listing.sellerUserId && user.role !== "admin")) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (seller.subscriptionStatus !== "active" && seller.role !== "admin" && user.id !== listing.sellerUserId && user.role !== "admin") {
    res.status(404).json({ error: "This listing is no longer available" });
    return;
  }

  const [holderResult] = await db
    .select({ value: count() })
    .from(marketplacePurchasesTable)
    .where(eq(marketplacePurchasesTable.listingId, listing.id));

  const [myPurchase] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(
      and(
        eq(marketplacePurchasesTable.listingId, listing.id),
        eq(marketplacePurchasesTable.buyerUserId, user.id)
      )
    );

  res.json(
    buildListingResponse(
      listing,
      project,
      seller,
      holderResult?.value ?? 0,
      myPurchase ?? null
    )
  );
});

router.post("/marketplace/listings", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;

  if (user.role !== "admin" && user.subscriptionStatus !== "active") {
    res.status(403).json({ error: "An active paid subscription is required to list projects on the Marketplace." });
    return;
  }

  const body = CreateListingBody.parse(req.body);

  let [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, body.projectId), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.isMarketplaceCopy) {
    res.status(400).json({ error: "Marketplace copies cannot be re-listed." });
    return;
  }

  // Apply any metadata provided in the listing request to the project
  type ProjectUpdate = Partial<InferInsertModel<typeof projectsTable>>;
  const metadataUpdate: ProjectUpdate = {};
  if (body.course !== undefined) metadataUpdate.course = body.course;
  if (body.term !== undefined) metadataUpdate.term = body.term;
  if (body.year !== undefined) metadataUpdate.year = body.year;
  if (body.school !== undefined) metadataUpdate.school = body.school;
  if (body.description !== undefined) metadataUpdate.description = body.description;

  if (Object.keys(metadataUpdate).length > 0) {
    await db.update(projectsTable).set(metadataUpdate).where(eq(projectsTable.id, body.projectId));
    [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, body.projectId));
  }

  const missingFields: string[] = [];
  if (!project.course) missingFields.push("Course");
  if (!project.term) missingFields.push("Term");
  if (!project.year) missingFields.push("Year");
  if (!project.school) missingFields.push("School");
  if (!project.description) missingFields.push("Description");

  if (missingFields.length > 0) {
    res.status(400).json({
      error: `Please fill in the following project fields before listing: ${missingFields.join(", ")}.`,
      missingFields,
    });
    return;
  }

  const [existingListing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.projectId, body.projectId));

  if (existingListing) {
    res.status(409).json({ error: "This project is already listed on the Marketplace.", listingId: existingListing.id });
    return;
  }

  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values({
      projectId: body.projectId,
      sellerUserId: user.id,
      priceCents: body.priceCents,
      isActive: body.isActive,
    })
    .returning();

  res.status(201).json(
    buildListingResponse(listing, project, { handle: user.handle, name: user.name }, 0)
  );
});

router.put("/marketplace/listings/:id", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (listing.sellerUserId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const body = UpdateListingBody.parse(req.body);
  const updates: Partial<typeof marketplaceListingsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.priceCents !== undefined) updates.priceCents = body.priceCents;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(marketplaceListingsTable)
    .set(updates)
    .where(eq(marketplaceListingsTable.id, id))
    .returning();

  // Apply any metadata updates to the underlying project
  type ProjectUpdate = Partial<InferInsertModel<typeof projectsTable>>;
  const metadataUpdate: ProjectUpdate = {};
  if (body.course !== undefined) metadataUpdate.course = body.course;
  if (body.term !== undefined) metadataUpdate.term = body.term;
  if (body.year !== undefined) metadataUpdate.year = body.year;
  if (body.school !== undefined) metadataUpdate.school = body.school;
  if (body.description !== undefined) metadataUpdate.description = body.description;

  if (Object.keys(metadataUpdate).length > 0) {
    await db.update(projectsTable).set(metadataUpdate).where(eq(projectsTable.id, updated.projectId));
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, updated.projectId));

  const [seller] = await db
    .select({ handle: usersTable.handle, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, updated.sellerUserId));

  const [holderResult] = await db
    .select({ value: count() })
    .from(marketplacePurchasesTable)
    .where(eq(marketplacePurchasesTable.listingId, updated.id));

  res.json(
    buildListingResponse(updated, project, seller ?? null, holderResult?.value ?? 0)
  );
});

router.post("/marketplace/listings/:id/checkout", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));

  if (!listing || !listing.isActive) {
    res.status(404).json({ error: "Listing not found or not available" });
    return;
  }

  if (listing.priceCents === 0) {
    res.status(400).json({ error: "This listing is free. Use the acquire endpoint instead." });
    return;
  }

  if (listing.sellerUserId === user.id) {
    res.status(400).json({ error: "You cannot purchase your own listing." });
    return;
  }

  const [existing] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(
      and(
        eq(marketplacePurchasesTable.listingId, id),
        eq(marketplacePurchasesTable.buyerUserId, user.id)
      )
    );

  if (existing?.copiedProjectId) {
    res.status(400).json({ error: "You have already purchased this listing.", copiedProjectId: existing.copiedProjectId });
    return;
  }

  const [seller] = await db
    .select({ subscriptionStatus: usersTable.subscriptionStatus, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, listing.sellerUserId));

  if (!seller || (seller.subscriptionStatus !== "active" && seller.role !== "admin")) {
    res.status(400).json({ error: "This listing is no longer available." });
    return;
  }

  const [sourceProject] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, listing.projectId));

  if (!sourceProject) {
    res.status(404).json({ error: "Source project not found" });
    return;
  }

  // Ensure a pending purchase record exists so the listing shows "payment processing"
  // and prevents the user from initiating a second checkout session.
  let pendingPurchase = existing;
  if (!pendingPurchase) {
    const commissionCents = Math.round(listing.priceCents * COMMISSION_RATE);
    [pendingPurchase] = await db
      .insert(marketplacePurchasesTable)
      .values({
        listingId: listing.id,
        buyerUserId: user.id,
        copiedProjectId: null,
        purchasePriceCents: listing.priceCents,
        commissionCents,
        stripePaymentIntentId: null,
      })
      .returning();
  }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: listing.priceCents,
            product_data: {
              name: sourceProject.name,
              description: sourceProject.description
                ? sourceProject.description.slice(0, 255)
                : `Marketplace study project`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/marketplace/${id}?checkout=success`,
      cancel_url: `${baseUrl}/marketplace/${id}?checkout=canceled`,
      metadata: {
        type: "marketplace",
        listingId: String(listing.id),
        buyerUserId: String(user.id),
        purchaseId: String(pendingPurchase.id),
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, "Failed to create marketplace checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.delete("/marketplace/purchases/pending/:listingId", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const listingId = parseInt(req.params.listingId, 10);

  const [pending] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(
      and(
        eq(marketplacePurchasesTable.listingId, listingId),
        eq(marketplacePurchasesTable.buyerUserId, user.id)
      )
    );

  if (!pending) {
    res.status(404).json({ error: "No pending purchase found" });
    return;
  }

  if (pending.copiedProjectId !== null) {
    res.status(400).json({ error: "Purchase is already completed and cannot be canceled" });
    return;
  }

  await db
    .delete(marketplacePurchasesTable)
    .where(eq(marketplacePurchasesTable.id, pending.id));

  res.json({ success: true });
});

router.post("/marketplace/listings/:id/acquire", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));

  if (!listing || !listing.isActive) {
    res.status(404).json({ error: "Listing not found or not available" });
    return;
  }

  if (listing.sellerUserId === user.id) {
    res.status(400).json({ error: "You cannot acquire your own listing." });
    return;
  }

  const [existing] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(
      and(
        eq(marketplacePurchasesTable.listingId, id),
        eq(marketplacePurchasesTable.buyerUserId, user.id)
      )
    );

  if (existing) {
    res.json({ alreadyAcquired: true, copiedProjectId: existing.copiedProjectId, purchaseId: existing.id });
    return;
  }

  const [sourceProject] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, listing.projectId));

  if (!sourceProject) {
    res.status(404).json({ error: "Source project not found" });
    return;
  }

  const [seller] = await db
    .select({ handle: usersTable.handle, subscriptionStatus: usersTable.subscriptionStatus, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, listing.sellerUserId));

  if (!seller || (seller.subscriptionStatus !== "active" && seller.role !== "admin")) {
    res.status(400).json({ error: "This listing is no longer available." });
    return;
  }

  if (listing.priceCents > 0) {
    const commissionCents = Math.round(listing.priceCents * COMMISSION_RATE);
    const [purchase] = await db
      .insert(marketplacePurchasesTable)
      .values({
        listingId: listing.id,
        buyerUserId: user.id,
        copiedProjectId: null,
        purchasePriceCents: listing.priceCents,
        commissionCents,
        stripePaymentIntentId: null,
      })
      .returning();

    res.status(202).json({
      paymentRequired: true,
      priceCents: listing.priceCents,
      purchaseId: purchase.id,
      message: "Payment processing is coming soon. Your purchase intent has been recorded.",
    });
    return;
  }

  const [copiedProject] = await db
    .insert(projectsTable)
    .values({
      name: sourceProject.name,
      userId: user.id,
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

  const [purchase] = await db
    .insert(marketplacePurchasesTable)
    .values({
      listingId: listing.id,
      buyerUserId: user.id,
      copiedProjectId: copiedProject.id,
      purchasePriceCents: 0,
      commissionCents: 0,
    })
    .returning();

  res.status(201).json({
    paymentRequired: false,
    copiedProjectId: copiedProject.id,
    purchaseId: purchase.id,
  });
});

router.post("/marketplace/listings/:id/push-update", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (listing.sellerUserId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db
    .update(marketplacePurchasesTable)
    .set({ updateAvailable: true, updateDismissed: false })
    .where(eq(marketplacePurchasesTable.listingId, id));

  const [holderResult] = await db
    .select({ value: count() })
    .from(marketplacePurchasesTable)
    .where(eq(marketplacePurchasesTable.listingId, id));

  res.json({ notifiedCount: holderResult?.value ?? 0 });
});

router.post("/marketplace/purchases/:id/accept-update", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [purchase] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(and(eq(marketplacePurchasesTable.id, id), eq(marketplacePurchasesTable.buyerUserId, user.id)));

  if (!purchase) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }

  if (!purchase.copiedProjectId) {
    res.status(400).json({ error: "No copied project to update" });
    return;
  }

  const [listing] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, purchase.listingId));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const sourceQuestions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.projectId, listing.projectId));

  await db.delete(questionsTable).where(eq(questionsTable.projectId, purchase.copiedProjectId));

  for (const q of sourceQuestions) {
    const [newQ] = await db
      .insert(questionsTable)
      .values({
        projectId: purchase.copiedProjectId,
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

  await db
    .update(marketplacePurchasesTable)
    .set({ updateAvailable: false, updateDismissed: false })
    .where(eq(marketplacePurchasesTable.id, id));

  res.json({ success: true, questionsUpdated: sourceQuestions.length });
});

router.post("/marketplace/purchases/:id/dismiss-update", async (req, res) => {
  const user = (req as unknown as AuthedRequest).currentUser;
  const id = parseInt(req.params.id, 10);

  const [purchase] = await db
    .select()
    .from(marketplacePurchasesTable)
    .where(and(eq(marketplacePurchasesTable.id, id), eq(marketplacePurchasesTable.buyerUserId, user.id)));

  if (!purchase) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }

  await db
    .update(marketplacePurchasesTable)
    .set({ updateDismissed: true })
    .where(eq(marketplacePurchasesTable.id, id));

  res.json({ success: true });
});

router.get("/admin/marketplace", requireAdmin, async (_req, res) => {
  const listings = await db
    .select()
    .from(marketplaceListingsTable)
    .orderBy(desc(marketplaceListingsTable.createdAt));

  const results = await Promise.all(
    listings.map(async (listing) => {
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, listing.projectId));

      const [seller] = await db
        .select({ handle: usersTable.handle, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, listing.sellerUserId));

      const [holderResult] = await db
        .select({ value: count() })
        .from(marketplacePurchasesTable)
        .where(eq(marketplacePurchasesTable.listingId, listing.id));

      return {
        id: listing.id,
        projectId: listing.projectId,
        projectName: project?.name ?? null,
        sellerHandle: seller?.handle ?? null,
        sellerName: seller?.name ?? null,
        sellerEmail: seller?.email ?? null,
        priceCents: listing.priceCents,
        isActive: listing.isActive,
        holderCount: holderResult?.value ?? 0,
        createdAt: listing.createdAt,
      };
    })
  );

  res.json(results);
});

export default router;
