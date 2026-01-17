// wheel.js (type="module")

// --------------------------
// Stripe-friendly outcomes (cosmetic only)
// --------------------------
const OUTCOMES = [
  "Support Badge: Midnight Patron",
  "Support Badge: Moonlit Ally",
  "Support Badge: Velvet Favor",
  "Support Badge: Crimson Thanks",
  "Message: “Well done — appreciated.”",
  "Message: “Noted with gratitude.”",
  "Message: “A graceful show of support.”",
  "Message: “Thank you.”",
  "Message: “You’re the best — thank you.”",
  "Support Badge: Royal Acknowledgment",
  "Support Badge: Dark Muse Supporter",
  "Message: “Your support is felt.”"
];

// --------------------------
// DOM
// --------------------------
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas?.getContext("2d");

const amountInput = document.getElementById("amountInput");
const payBtn = document.getElementById("payBtn");
const spinBtn = document.getElementById("spinBtn");
const resultText = document.getElementById("resultText");
const spinStatus = document.getElementById("spinStatus");
const chips = document.getElementById("chips");
const errText = document.getElementById("errText");

if (!canvas || !ctx || !amountInput || !payBtn || !spinBtn || !resultText || !spinStatus || !chips) {
  console.error("Missing wheel elements.");
}

// --------------------------
// State
// --------------------------
let unlocked = false;
let spunThisUnlock = false;
let currentRotation = 0;

// Optional sounds (safe – no “cash” cues)
const tickSound = (window.Howl)
  ? new Howl({ src: ["./tick.mp3"], volume: 0.25 })
  : null;

function setLockedUI() {
  unlocked = false;
  spunThisUnlock = false;
  spinBtn.disabled = true;
  spinBtn.classList.add("ghost");
  spinStatus.textContent = "Locked — complete contribution to unlock.";
}

function setUnlockedUI() {
  unlocked = true;
  spunThisUnlock = false;
  spinBtn.disabled = false;
  spinBtn.classList.remove("ghost");
  spinStatus.textContent = "Unlocked — you may spin once for a cosmetic badge.";
}

// Expose a function you can call after Stripe success
window.unlockSpin = () => setUnlockedUI();

// Start locked
setLockedUI();

// --------------------------
// Render chips (shows possible outcomes)
// --------------------------
function renderChips() {
  chips.innerHTML = "";
  OUTCOMES.forEach((o) => {
    const el = document.createElement("span");
    el.className = "chip";
    el.textContent = o.replace("Support Badge: ", "").replace("Message: ", "");
    chips.appendChild(el);
  });
}
renderChips();

// --------------------------
// Wheel drawing (simple but clean)
// --------------------------
function drawWheel(rotationRad = 0) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, W, H);

  const n = OUTCOMES.length;
  const slice = (Math.PI * 2) / n;

  for (let i = 0; i < n; i++) {
    const start = rotationRad + i * slice;
    const end = start + slice;

    // alternating dark slices
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#1f1f1f" : "#2a2a2a";
    ctx.fill();

    // slice border
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // label (short)
    const label = OUTCOMES[i]
      .replace("Support Badge: ", "")
      .replace("Message: ", "");

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "14px sans-serif";
    ctx.fillText(label.length > 18 ? label.slice(0, 18) + "…" : label, radius - 16, 6);
    ctx.restore();
  }

  // center cap
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
drawWheel(currentRotation);

// --------------------------
// Payment button (placeholder)
// --------------------------
payBtn.addEventListener("click", async () => {
  if (errText) errText.textContent = "";

  const amount = Number(amountInput.value);
  if (!amount || amount < 1) {
    if (errText) errText.textContent = "Please enter a valid amount.";
    return;
  }

  // ✅ This is where you trigger Stripe checkout
  // - If you’re using Vercel backend: call /api/create-checkout-session
  // - After Stripe returns success: call window.unlockSpin()

  // TEMP DEV SHORTCUT (so you can test the spin flow right now):
  // Remove this once Stripe success is wired.
  setUnlockedUI();
});

// --------------------------
// Spin logic (one spin per unlock)
// --------------------------
spinBtn.addEventListener("click", () => {
  if (!unlocked || spunThisUnlock) return;

  spunThisUnlock = true;
  spinBtn.disabled = true;

  // Choose outcome
  const n = OUTCOMES.length;
  const index = Math.floor(Math.random() * n);
  const result = OUTCOMES[index];

  // Spin math: land selected slice at pointer (top)
  const slice = (Math.PI * 2) / n;
  const target = (Math.PI * 1.5) - (index * slice + slice / 2); // pointer at top
  const extraSpins = 5 * Math.PI * 2;

  const startRot = currentRotation;
  const endRot = target + extraSpins;

  const startTime = performance.now();
  const duration = 2200;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function anim(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(t);
    currentRotation = startRot + (endRot - startRot) * eased;

    drawWheel(currentRotation);

    // Optional ticking — only if you have tick.mp3 present
    if (tickSound && t < 0.98) {
      // very light tick, not tied to money
      if (Math.random() < 0.08) tickSound.play();
    }

    if (t < 1) requestAnimationFrame(anim);
    else {
      // finish
      resultText.textContent = result;

      if (window.confetti) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }

      spinStatus.textContent = "Spin used. (Cosmetic result only.)";
      unlocked = false; // relock until next contribution
    }
  }

  requestAnimationFrame(anim);
});
