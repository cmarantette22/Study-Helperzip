import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  (req as any).currentUser = user;
  next();
}

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).currentUser;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (user.role === "admin") {
    next();
    return;
  }

  const status = user.subscriptionStatus;
  if (status !== "active" && status !== "paused") {
    res.status(403).json({ error: "An active subscription is required", code: "NO_SUBSCRIPTION" });
    return;
  }

  if (status === "paused") {
    res.status(403).json({ error: "Your subscription is paused", code: "SUBSCRIPTION_PAUSED" });
    return;
  }

  next();
}
