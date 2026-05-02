import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, passwordResetTokensTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, body.email.toLowerCase().trim()));

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    (req.session as any).userId = user.id;

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      subscriptionStatus: user.subscriptionStatus,
      planType: user.planType,
      pauseDate: user.pauseDate,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    subscriptionStatus: user.subscriptionStatus,
    planType: user.planType,
    pauseDate: user.pauseDate,
    handle: user.handle,
    school: user.school,
    avatar: user.avatar,
    bio: user.bio,
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const body = ChangePasswordBody.parse(req.body);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    if (body.newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(usersTable.id, userId));

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, (email as string).toLowerCase().trim()));

    if (!user) {
      res.json({ message: "If an account exists with that email, a reset link has been generated." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const base = process.env.BASE_PATH || "";
    const resetLink = `${proto}://${host}${base}/reset-password?token=${token}`;

    res.json({ resetLink });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to generate reset link" });
  }
});

router.get("/auth/reset-password/validate", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      res.json({ valid: false });
      return;
    }

    const [row] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, new Date())
        )
      );

    res.json({ valid: !!row });
  } catch (err) {
    res.json({ valid: false });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }
    if ((newPassword as string).length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const [row] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, new Date())
        )
      );

    if (!row) {
      res.status(400).json({ error: "This reset link is invalid or has expired" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(usersTable)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(usersTable.id, row.userId));

    await db
      .update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.id, row.id));

    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
