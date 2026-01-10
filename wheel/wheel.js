const $ = (id) => document.getElementById(id);

const canvas = $("wheelCanvas");
const ctx = canvas.getContext("2d");

const maxInput = $("maxInput");
const sliceInput = $("sliceInput");
const spinBtn = $("spinBtn");
const regenBtn = $("regenBtn");
const resultText = $("resultText");
const chips = $("chips");

let values = [];
let spinning = false;

let rotation = 0; // radians
let raf = null;

// --- audio (CDN howler) ---
const sounds = {
  spinLoop: new Howl({
    src: ["https://cdn.jsdelivr.net/gh/sfxhub/ui-sounds@main/spin-loop.mp3"],
    loop: true,
    volume: 0.22
  }),
  tick: new Howl({
    src: ["https://cdn.jsdelivr.net/gh/sfxhub/ui-sounds@main/tick.mp3"],
    volume: 0.20
  }),
  win: new Howl({
    src: ["https://cdn.jsdelivr.net/gh/sfxhub/ui-sounds@main/win.mp3"],
    volume: 0.50
  })
};

// If you don't have local audio files yet, comment the above and use CDN mp3s,
// or add files under: /wheel/audio/*.mp3

function clampInt(val, min, max) {
  const n = Math.floor(Number(val));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeValues() {
  const max = clampInt(maxInput.value, 5, 100000);
  const n = clampInt(sliceInput.value, 6, 24);
  maxInput.value = String(max);
  sliceInput.value = String(n);

  values = Array.from({ length: n }, () => randInt(5, max));
  resultText.textContent = "—";
  renderChips();
  draw();
}

function renderChips() {
  chips.innerHTML = "";
  for (const v of values) {
    const s = document.createElement("span");
    s.textContent = `$${v}`;
    chips.appendChild(s);
  }
}

function draw() {
  // crisp on hi-dpi
  const dpr = window.devicePixelRatio || 1;
  const cssSize = 520;
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssSize, cssSize);

  const cx = cssSize / 2;
  const cy = cssSize / 2;
  const radius = cssSize * 0.42;
  const n = values.length || 1;
  const step = (Math.PI * 2) / n;

  // subtle glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();

  // segments
  for (let i = 0; i < n; i++) {
    const start = rotation + i * step;
    const end = start + step;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // label
    const mid = (start + end) / 2;
    const label = `$${values[i]}`;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(label, radius - 16, 0);
    ctx.restore();
  }

  // hub
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function stopAllAudio() {
  try { sounds.spinLoop.stop(); } catch {}
}

function confettiWin() {
  const burst = (ratio, opts) =>
    confetti({
      ...opts,
      origin: { y: 0.55 },
      particleCount: Math.floor(240 * ratio),
    });

  burst(0.35, { spread: 28, startVelocity: 52 });
  burst(0.25, { spread: 70 });
  burst(0.20, { spread: 110, decay: 0.92, scalar: 0.95 });
  burst(0.20, { spread: 140, startVelocity: 35, decay: 0.94, scalar: 1.1 });
}

function spin() {
  if (spinning || values.length < 2) return;
  spinning = true;
  spinBtn.disabled = true;
  regenBtn.disabled = true;

  // user gesture: safe to start audio
  stopAllAudio();
  try { sounds.spinLoop.play(); } catch {}

  const n = values.length;
  const step = (Math.PI * 2) / n;

  // pick winner slice
  const winnerIndex = Math.floor(Math.random() * n);
  const winnerValue = values[winnerIndex];

  // pointer is at top (-90deg)
  const pointer = -Math.PI / 2;

  // want: rotation + (winnerIndex+0.5)*step == pointer (mod 2π)
  let target = pointer - (winnerIndex + 0.5) * step;

  // add extra spins
  target += randInt(6, 9) * Math.PI * 2;

  const startRot = rotation;
  const delta = target - (startRot % (Math.PI * 2));
  const duration = randInt(4200, 5600);
  const start = performance.now();

  let lastTick = Math.floor(rotation / step);

  const anim = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const e = easeOutCubic(t);
    rotation = startRot + delta * e;

    // tick when crossing boundaries (optional)
    const tickMark = Math.floor(rotation / step);
    if (tickMark !== lastTick && t < 0.98) {
      lastTick = tickMark;
      try { sounds.tick.play(); } catch {}
    }

    draw();

    if (t < 1) {
      raf = requestAnimationFrame(anim);
    } else {
      stopAllAudio();
      try { sounds.win.play(); } catch {}
      resultText.textContent = `$${winnerValue}`;
      confettiWin();

      spinning = false;
      spinBtn.disabled = false;
      regenBtn.disabled = false;
    }
  };

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(anim);
}

// events
spinBtn.addEventListener("click", spin);
regenBtn.addEventListener("click", makeValues);
maxInput.addEventListener("change", makeValues);
sliceInput.addEventListener("change", makeValues);
canvas.addEventListener("click", spin);

// init
makeValues();
window.addEventListener("resize", draw);
