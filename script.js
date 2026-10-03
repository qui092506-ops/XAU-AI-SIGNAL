const API_URL = "https://xaus.com/api/v1/spot?compact=1";
const REFRESH_SECONDS = 30;

const state = {
  price: null,
  updatedAt: null,
  dataState: "loading",
  secondsLeft: REFRESH_SECONDS,
  signal: null,
  history: JSON.parse(localStorage.getItem("xauKatanaHistory") || "[]")
};

const $ = (id) => document.getElementById(id);

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function setPriceUI() {
  $("price").textContent = state.price ? `$${money(state.price)}` : "—";

  const pill = $("priceState");
  pill.className = "status-pill";

  if (state.dataState === "live") {
    pill.classList.add("live");
    pill.textContent = "LIVE";
    $("dataMessage").textContent = "Connected to public XAU/USD spot data.";
  } else if (state.dataState === "stale") {
    pill.classList.add("stale");
    pill.textContent = "STALE";
    $("dataMessage").textContent = "The feed reports stale data. Waiting for a fresher quote.";
  } else if (state.dataState === "error") {
    pill.classList.add("error");
    pill.textContent = "ERROR";
    $("dataMessage").textContent = "Could not reach the market-price feed.";
  } else {
    pill.classList.add("loading");
    pill.textContent = "CONNECTING";
    $("dataMessage").textContent = "Connecting to XAU/USD market data…";
  }

  if (state.updatedAt) {
    const d = new Date(state.updatedAt);
    $("lastUpdate").textContent = Number.isNaN(d.getTime())
      ? String(state.updatedAt)
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } else {
    $("lastUpdate").textContent = "—";
  }

  $("market").textContent = state.price ? "OPEN / FEED" : "—";
  $("session").textContent = getSession();
}

function getSession() {
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 8) return "ASIA";
  if (hour >= 8 && hour < 13) return "LONDON";
  if (hour >= 13 && hour < 21) return "NEW YORK";
  return "ASIA";
}

async function fetchPrice() {
  try {
    const response = await fetch(`${API_URL}&_=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    const rawPrice =
      data?.xau?.price ??
      data?.spot_usd_oz ??
      data?.price ??
      data?.data?.xau?.price;

    const parsed = Number(rawPrice);
    if (!Number.isFinite(parsed)) throw new Error("Price not found in API response");

    state.price = parsed;
    state.updatedAt =
      data?.updated_at ??
      data?.xau?.updated_at ??
      data?.timestamp ??
      new Date().toISOString();

    const apiStatus =
      data?.data_state?.status ??
      data?.status ??
      "fresh";

    state.dataState = String(apiStatus).toLowerCase().includes("stale")
      ? "stale"
      : "live";

    state.secondsLeft = REFRESH_SECONDS;
    setPriceUI();

    if (!state.signal) generateSignal(false);
  } catch (error) {
    console.error("XAU price error:", error);
    state.dataState = "error";
    state.secondsLeft = 10;
    setPriceUI();
  }
}

function generateSignal(saveHistory = true) {
  if (!Number.isFinite(state.price)) {
    $("analysis").textContent = "No market price available yet.";
    return;
  }

  const direction = Math.random() >= 0.5 ? "BUY" : "SELL";
  const strength = Math.floor(72 + Math.random() * 24);
  const entry = state.price;

  const slDistance = 4 + Math.random() * 2;
  const tp1Distance = 5 + Math.random() * 2;
  const tp2Distance = 10 + Math.random() * 3;

  const sl = direction === "BUY" ? entry - slDistance : entry + slDistance;
  const tp1 = direction === "BUY" ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = direction === "BUY" ? entry + tp2Distance : entry - tp2Distance;

  const rr = ((tp2Distance) / slDistance).toFixed(1);
  const bias = direction === "BUY" ? "BULLISH" : "BEARISH";

  const reasons = direction === "BUY"
    ? [
        "Simulated momentum model detects bullish continuation conditions.",
        "Simulated model sees upward momentum with controlled risk.",
        "Simulated setup favours a long scalp around the current spot price."
      ]
    : [
        "Simulated momentum model detects bearish continuation conditions.",
        "Simulated model sees downward momentum with controlled risk.",
        "Simulated setup favours a short scalp around the current spot price."
      ];

  state.signal = { direction, strength, entry, sl, tp1, tp2, rr, bias };

  $("signal").textContent = direction;
  $("signal").className = direction === "BUY" ? "buy" : "sell";
  $("strength").textContent = `${strength}%`;
  $("bias").textContent = bias;
  $("entry").textContent = money(entry);
  $("sl").textContent = money(sl);
  $("tp1").textContent = money(tp1);
  $("tp2").textContent = money(tp2);
  $("rr").textContent = `1:${rr}`;
  $("analysis").textContent = reasons[Math.floor(Math.random() * reasons.length)];

  $("setupDirection").textContent = direction;
  $("setupDirection").className = direction === "BUY" ? "buy" : "sell";
  $("setupStrength").textContent = `${strength}%`;
  $("setupRR").textContent = `1:${rr}`;

  if (saveHistory) {
    state.history.unshift({
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      direction,
      price: entry,
      strength
    });

    state.history = state.history.slice(0, 10);
    localStorage.setItem("xauKatanaHistory", JSON.stringify(state.history));
    renderHistory();
  }
}

function renderHistory() {
  const el = $("history");

  if (!state.history.length) {
    el.innerHTML = `<div class="warning">No signals generated yet.</div>`;
    return;
  }

  el.innerHTML = state.history.map(item => `
    <div class="history-item">
      <strong class="${item.direction === "BUY" ? "buy" : "sell"}">${item.direction}</strong>
      <span>$${money(item.price)}</span>
      <span>${item.strength}%</span>
      <span class="history-time">${item.time}</span>
    </div>
  `).join("");
}

$("generateBtn").addEventListener("click", () => generateSignal(true));

$("clearBtn").addEventListener("click", () => {
  state.history = [];
  localStorage.removeItem("xauKatanaHistory");
  renderHistory();
});

setInterval(() => {
  state.secondsLeft -= 1;
  if (state.secondsLeft <= 0) state.secondsLeft = REFRESH_SECONDS;
  $("countdown").textContent = `${state.secondsLeft}s`;
}, 1000);

setInterval(() => {
  if (state.secondsLeft <= 1) fetchPrice();
}, 1000);

renderHistory();
setPriceUI();
fetchPrice();
