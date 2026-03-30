import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedAdminUser() {
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .limit(1);

    if (existing.length === 0) {
      const hash = await bcrypt.hash("admin2007", 10);
      await db.insert(usersTable).values({
        name: "Admin",
        email: "chris+studybuddy@marantette.com",
        passwordHash: hash,
        role: "admin",
        mustChangePassword: false,
      });
      logger.info("Admin user seeded");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedAdminUser().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
