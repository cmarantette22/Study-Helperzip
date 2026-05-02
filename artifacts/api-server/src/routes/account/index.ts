import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, projectsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();

const FREE_TIER_PROJECT_LIMIT = 12;

router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, plan, school, handle } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test((email as string).trim())) {
      res.status(400).json({ error: "Please enter a valid email address (e.g. you@example.com)" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    if (handle) {
      const handleRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!handleRegex.test(handle)) {
        res.status(400).json({ error: "Username can only contain letters, numbers, and underscores (3–30 characters)" });
        return;
      }
      const existingHandle = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.handle, handle.toLowerCase()));
      if (existingHandle.length > 0) {
        res.status(409).json({ error: "That username is already taken" });
        return;
      }
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, (email as string).toLowerCase().trim()));

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const selectedPlan = plan === "monthly" || plan === "annual" ? plan : "free";
    const subscriptionStatus = selectedPlan === "free" ? "free" : "none";
    const planType = selectedPlan === "free" ? "free" : null;

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: (email as string).toLowerCase().trim(),
        passwordHash,
        role: "user",
        mustChangePassword: false,
        subscriptionStatus,
        planType,
        school: school?.trim() || null,
        handle: handle ? handle.toLowerCase() : null,
      })
      .returning();

    (req.session as any).userId = user.id;

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      subscriptionStatus: user.subscriptionStatus,
      planType: user.planType,
      school: user.school,
      handle: user.handle,
      selectedPlan,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.put("/account/email", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Password is incorrect" });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, (email as string).toLowerCase().trim()));

    if (existing.length > 0 && existing[0].id !== user.id) {
      res.status(409).json({ error: "Email is already in use" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ email: (email as string).toLowerCase().trim() })
      .where(eq(usersTable.id, user.id))
      .returning();

    res.json({ id: updated.id, name: updated.name, email: updated.email });
  } catch (err) {
    console.error("Update email error:", err);
    res.status(500).json({ error: "Failed to update email" });
  }
});

router.put("/account/password", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }
    if ((newPassword as string).length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(usersTable.id, user.id));

    res.json({ success: true });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

router.put("/account/profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { school, bio, avatar } = req.body;

    const updates: Record<string, string | null> = {};
    if (school !== undefined) updates.school = school?.trim() || null;
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (avatar !== undefined) updates.avatar = avatar?.trim() || null;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, user.id))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      handle: updated.handle,
      school: updated.school,
      bio: updated.bio,
      avatar: updated.avatar,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.delete("/account", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;

    await db.delete(projectsTable).where(eq(projectsTable.userId, user.id));
    await db.delete(usersTable).where(eq(usersTable.id, user.id));

    req.session.destroy(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export { FREE_TIER_PROJECT_LIMIT };
export default router;
