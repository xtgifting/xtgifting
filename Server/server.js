require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
app.use(cors());
app.use(express.json());

// Stripe SECRET key is added to an env var
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount } = req.body;

    const amt = Number(amount);
    if (!amt || amt < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const unitAmount = Math.round(amt * 100); // cents

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Voluntary Gift" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],

      // ✅ IMPORTANT: return_url must be your FRONTEND URL (not the backend port)
      // Use whatever URL your site is actually running at (Live Server / Vercel domain).
      return_url: "http://127.0.0.1:3000/?session_id={CHECKOUT_SESSION_ID}",

      // ✅ Dark theme for Stripe Embedded Checkout UI
      // (If Stripe ever ignores these, set the same in Dashboard > Branding > Checkout)
      branding_settings: {
        background_color: "#121212",
        primary_color: "#7c5cff",
        border_radius: "8px",
      },
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(4242, () => console.log("✅ Server running on http://localhost:4242"));
