import Stripe from "stripe";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { amount } = req.body || {};
    const dollars = Number(amount);

    if (!dollars || dollars < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in Vercel env vars" });
    }

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Voluntary Gift" },
            unit_amount: Math.round(dollars * 100)
          },
          quantity: 1
        }
      ],
      return_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`
    });

    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}