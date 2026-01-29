const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const match = document.querySelector(".match");
const cakeArea = document.querySelector(".cake-area");
const cakeImg = document.querySelector(".cake");
const instructionsEl = document.getElementById("instructions");

// Constants
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const WEBCAM_WIDTH = isMobile ? 240 : 300;
const WEBCAM_HEIGHT = isMobile ? 180 : 225;
const LIGHT_DISTANCE = 20; // how close match needs to be to light candles

canvas.width = WEBCAM_WIDTH;
canvas.height = WEBCAM_HEIGHT;

// Track hand position
let handPosition = { x: 0.5, y: 0.5 };
let isHandDetected = false;

let isCakeLit = false;
let isCandlesBlownOut = false;

// ------------------- Hand Tracking (MediaPipe) -------------------
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: isMobile ? 0 : 1,
  minDetectionConfidence: isMobile ? 0.6 : 0.7,
  minTrackingConfidence: isMobile ? 0.4 : 0.5,
});

hands.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    isHandDetected = true;

    const indexTip = landmarks[8]; // index finger tip
    handPosition.x = 1 - indexTip.x;
    handPosition.y = indexTip.y;

    updateMatchPosition();
    checkCandleLighting();
  } else {
    isHandDetected = false;
  }
});

// Match follows finger
function updateMatchPosition() {
  if (!isHandDetected) return;

  const cakeRect = cakeArea.getBoundingClientRect();
  const padding = 20;

  const matchX = padding + handPosition.x * (cakeRect.width - padding * 2 - 40);
  const matchY = padding + handPosition.y * (cakeRect.height - padding * 2 - 60);

  match.style.left = `${matchX}px`;
  match.style.top = `${matchY}px`;
}

// Light candles when match close to candle area
function checkCandleLighting() {
  if (isCakeLit || isCandlesBlownOut) return;

  const matchRect = match.getBoundingClientRect();
  const cakeRect = cakeImg.getBoundingClientRect();

  const matchTipX = matchRect.left + matchRect.width / 2;
  const matchTipY = matchRect.top;

  const candleX = cakeRect.left + cakeRect.width / 2;
  const candleY = cakeRect.top + 10;

  const distance = Math.hypot(matchTipX - candleX, matchTipY - candleY);

  if (distance < LIGHT_DISTANCE) {
    lightCake();
  }
}

function lightCake() {
  if (isCakeLit) return;
  isCakeLit = true;
  cakeImg.src = "assets/cake_lit.gif";
  match.style.display = "none";
}

// Blow out candles (triggered by voice)
function blowOutCandles() {
  if (!isCakeLit || isCandlesBlownOut) return;

  isCandlesBlownOut = true;
  cakeImg.src = "assets/cake_unlit.gif";
  createConfetti();
}

// ------------------- Confetti -------------------
const CONFETTI_SYMBOLS = ["⭒","˚","⋆","⊹","₊","݁","˖","✦","✧","·","°","✶"];

function createConfetti() {
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);

  const confettiCount = 90;

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement("span");
      confetti.className = "confetti";
      confetti.textContent =
        CONFETTI_SYMBOLS[Math.floor(Math.random() * CONFETTI_SYMBOLS.length)];

      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.fontSize = 0.8 + Math.random() * 1.2 + "rem";

      const duration = 4 + Math.random() * 4;
      confetti.style.animationDuration = duration + "s";
      confetti.style.animationDelay = Math.random() * 0.5 + "s";

      const swayAmount = (Math.random() - 0.5) * 100;
      confetti.style.setProperty("--sway", swayAmount + "px");

      container.appendChild(confetti);

      setTimeout(() => confetti.remove(), (duration + 1) * 1000);
    }, i * 40);
  }

  setTimeout(() => container.remove(), 15000);
}

// ------------------- Camera -------------------
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: WEBCAM_WIDTH,
        height: WEBCAM_HEIGHT,
        facingMode: "user",
      },
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play();
      startHandTracking();
    };
  } catch (err) {
    console.error("Error accessing webcam:", err);
    alert("Could not access webcam. Please allow camera permissions.");
  }
}

function startHandTracking() {
  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: WEBCAM_WIDTH,
    height: WEBCAM_HEIGHT,
  });

  camera.start();
}

// ------------------- Plane Sparkle Trail -------------------
const SPARKLES = ["✦", "✧", "⋆", "⭒", "˚", "⊹"];

function spawnSparkle(x, y) {
  const s = document.createElement("span");
  s.className = "sparkle";
  s.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.style.fontSize = `${0.7 + Math.random() * 0.8}rem`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 900);
}

function startPlaneSparkles() {
  const plane = document.querySelector(".sky-plane");
  if (!plane) return;

  setInterval(() => {
    const r = plane.getBoundingClientRect();
    const x = r.left + r.width * 0.15;
    const y = r.top + r.height * 0.6;
    spawnSparkle(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10);
  }, 120);
}

// ------------------- Voice: say "blow" -------------------
function initSpeechBlow() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("SpeechRecognition not supported in this browser.");
    if (instructionsEl) {
      instructionsEl.innerHTML =
        `Your browser doesn't support voice recognition 😭<br/>Try Chrome on desktop.`;
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript.toLowerCase();
    }

    // ✅ if they say "blow", blow out candles
    if (transcript.includes("blow")) {
      blowOutCandles();
    }
  };

  recognition.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);

    // Some browsers block autoplay mic until a gesture
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      if (instructionsEl) {
        instructionsEl.innerHTML =
          `Mic blocked — click once anywhere to enable voice, then say <span class="blow-word">"blow"</span> ✨`;
      }

      // One click to re-try starting recognition
      document.body.addEventListener(
        "click",
        () => {
          try { recognition.start(); } catch (err) {}
          if (instructionsEl) {
            instructionsEl.innerHTML =
              `Now say <span class="blow-word">"blow"</span> to blow out the candles ✨`;
          }
        },
        { once: true }
      );
    }
  };

  // Try start immediately (works on many desktops)
  try {
    recognition.start();
  } catch (e) {
    // ignore "already started" etc.
  }
}

// ------------------- Start everything -------------------
window.addEventListener("DOMContentLoaded", () => {
  initCamera();
  startPlaneSparkles();
  initSpeechBlow();
});
