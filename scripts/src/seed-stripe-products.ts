import Stripe from "stripe";

const CONNECTION_ID = "conn_stripe_01KNFVCQQTSSHZZ6SFFQ1DB6N7";

async function getStripeKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;

  if (!hostname || !identity) {
    throw new Error("Missing REPLIT_CONNECTORS_HOSTNAME or REPL_IDENTITY");
  }

  const res = await fetch(`https://${hostname}/connection/${CONNECTION_ID}`, {
    headers: { "X-Replit-Identity": identity },
  });
  const data = await res.json() as any;
  return data.secret;
}

async function seedProducts() {
  try {
    const secret = await getStripeKey();
    const stripe = new Stripe(secret);

    console.log("Checking for existing Study Buddy products...");

    const existing = await stripe.products.search({
      query: "name:'Study Buddy' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log("Study Buddy product already exists — checking prices...");
      const product = existing.data[0];
      const prices = await stripe.prices.list({ product: product.id, active: true });
      for (const price of prices.data) {
        const interval = (price.recurring as any)?.interval;
        console.log(`  - ${price.id}: $${(price.unit_amount! / 100).toFixed(2)}/${interval}`);
      }
      return;
    }

    const product = await stripe.products.create({
      name: "Study Buddy",
      description: "AI-powered study application subscription",
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 1500,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`Created monthly price: $15.00/month (${monthly.id})`);

    const annual = await stripe.prices.create({
      product: product.id,
      unit_amount: 10000,
      currency: "usd",
      recurring: { interval: "year" },
    });
    console.log(`Annual price: $100.00/year (${annual.id})`);

    console.log("Done! Webhooks will sync these prices to your database.");
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

seedProducts();
