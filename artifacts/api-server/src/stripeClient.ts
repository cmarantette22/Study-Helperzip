import Stripe from "stripe";
import { StripeSync, runMigrations } from "stripe-replit-sync";

const CONNECTION_ID = "conn_stripe_01KNFVCQQTSSHZZ6SFFQ1DB6N7";

async function getStripeCredentials(): Promise<{ secret: string; accountId: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;

  if (!hostname || !identity) {
    throw new Error("Missing REPLIT_CONNECTORS_HOSTNAME or REPL_IDENTITY env vars");
  }

  const url = `https://${hostname}/connection/${CONNECTION_ID}`;
  const response = await fetch(url, {
    headers: { "X-Replit-Identity": identity },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return { secret: data.secret, accountId: data.account_id };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secret } = await getStripeCredentials();
  return new Stripe(secret);
}

let stripeSyncInstance: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;

  const { secret } = await getStripeCredentials();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  stripeSyncInstance = new StripeSync({
    stripeSecretKey: secret,
    poolConfig: { connectionString: databaseUrl },
  });

  return stripeSyncInstance;
}

export { runMigrations };
