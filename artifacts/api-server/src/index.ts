import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runMigrations, getStripeSync } from "./stripeClient";

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

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    stripeSync.syncBackfill().then(() => {
      logger.info("Stripe data synced");
    }).catch((err) => {
      logger.error({ err }, "Error syncing Stripe data");
    });
  } catch (err) {
    logger.error({ err }, "Failed to initialize Stripe");
  }
}

async function startPausedAccountCleanup() {
  setInterval(async () => {
    try {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const expiredUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.subscriptionStatus, "paused"));

      for (const user of expiredUsers) {
        if (user.pauseDate && user.pauseDate < twelveMonthsAgo) {
          await db.delete(usersTable).where(eq(usersTable.id, user.id));
          logger.info({ userId: user.id }, "Deleted paused account after 12 months");
        }
      }
    } catch (err) {
      logger.error({ err }, "Error in paused account cleanup");
    }
  }, 24 * 60 * 60 * 1000);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await seedAdminUser();
await initStripe();
startPausedAccountCleanup();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
