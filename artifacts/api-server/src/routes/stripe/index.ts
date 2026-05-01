import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { getUncachableStripeClient } from "../../stripeClient";
import { stripeStorage } from "../../stripe-storage";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";


const router: IRouter = Router();

router.use(requireAuth);

router.get("/stripe/subscription", async (req, res) => {
  try {
    const user = (req as any).currentUser;

    if (!user.stripeSubscriptionId) {
      res.json({ subscription: null, planType: user.planType, subscriptionStatus: user.subscriptionStatus, pauseDate: user.pauseDate });
      return;
    }

    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({
      subscription,
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      pauseDate: user.pauseDate,
    });
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

router.post("/stripe/checkout", async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { priceId, planType } = req.body;

    if (!priceId || !planType) {
      res.status(400).json({ error: "priceId and planType are required" });
      return;
    }

    if (!["monthly", "annual"].includes(planType)) {
      res.status(400).json({ error: "planType must be 'monthly' or 'annual'" });
      return;
    }

    if (user.subscriptionStatus === "active") {
      res.status(400).json({ error: "You already have an active subscription" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/subscription?checkout=canceled`,
      metadata: { userId: String(user.id), planType },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/stripe/pause", async (req, res) => {
  try {
    const user = (req as any).currentUser;

    if (user.planType !== "monthly") {
      res.status(400).json({ error: "Only monthly plans can be paused" });
      return;
    }

    if (user.subscriptionStatus !== "active") {
      res.status(400).json({ error: "Subscription is not active" });
      return;
    }

    if (!user.stripeSubscriptionId) {
      res.status(400).json({ error: "No subscription found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      pause_collection: { behavior: "void" },
    });

    const updated = await stripeStorage.updateUserStripeInfo(user.id, {
      subscriptionStatus: "paused",
      pauseDate: new Date(),
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Pause error:", err);
    res.status(500).json({ error: "Failed to pause subscription" });
  }
});

router.post("/stripe/resume", async (req, res) => {
  try {
    const user = (req as any).currentUser;

    if (user.subscriptionStatus !== "paused") {
      res.status(400).json({ error: "Subscription is not paused" });
      return;
    }

    if (!user.stripeSubscriptionId) {
      res.status(400).json({ error: "No subscription found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      pause_collection: "",
    } as any);

    const updated = await stripeStorage.updateUserStripeInfo(user.id, {
      subscriptionStatus: "active",
      pauseDate: null,
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Resume error:", err);
    res.status(500).json({ error: "Failed to resume subscription" });
  }
});

router.post("/stripe/cancel", async (req, res) => {
  try {
    const user = (req as any).currentUser;

    if (!user.stripeSubscriptionId) {
      res.status(400).json({ error: "No subscription found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    const updated = await stripeStorage.updateUserStripeInfo(user.id, {
      subscriptionStatus: "canceled",
      stripeSubscriptionId: undefined,
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

router.post("/stripe/portal", async (req, res) => {
  try {
    const user = (req as any).currentUser;

    if (!user.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/subscription`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

router.get("/stripe/prices", async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();

    const products = await stripe.products.list({ active: true, limit: 10 });
    const studyBuddyProduct = products.data.find((p) => p.name === "Study Buddy");

    if (!studyBuddyProduct) {
      res.json({ data: [] });
      return;
    }

    const prices = await stripe.prices.list({
      product: studyBuddyProduct.id,
      active: true,
      limit: 10,
    });

    const rows = prices.data.map((pr) => ({
      product_id: studyBuddyProduct.id,
      name: studyBuddyProduct.name,
      description: studyBuddyProduct.description,
      price_id: pr.id,
      unit_amount: pr.unit_amount,
      currency: pr.currency,
      recurring: pr.recurring,
      metadata: pr.metadata,
    }));

    rows.sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));

    res.json({ data: rows });
  } catch (err) {
    console.error("Prices error:", err);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

export default router;
