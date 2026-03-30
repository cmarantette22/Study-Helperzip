import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { CreateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  req.adminUser = user;
  next();
}

router.get("/admin/users", requireAdmin, async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      mustChangePassword: usersTable.mustChangePassword,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.post("/admin/users", requireAdmin, async (req, res) => {
  try {
    const body = CreateUserBody.parse(req.body);

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, body.email.toLowerCase().trim()));

    if (existing.length > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const tempPassword = body.password;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [user] = await db
      .insert(usersTable)
      .values({
        name: body.name,
        email: body.email.toLowerCase().trim(),
        passwordHash,
        role: "user",
        mustChangePassword: true,
      })
      .returning();

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      tempPassword,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "admin") {
    res.status(400).json({ error: "Cannot delete admin users" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
