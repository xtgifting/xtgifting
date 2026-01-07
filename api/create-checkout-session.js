import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount } = req.body;

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Voluntary Gift" },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      return_url: `https://${process.env.DOMAIN}/?session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
