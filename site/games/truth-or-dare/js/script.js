const CARD_COUNTS = {
  truth: 42,
  dare: 50
};

const RANDOM_TRUTH_CHANCE = 0.25;
const CARD_LABELS = {
  truth: "TRUTH · 真心话",
  dare: "DARE · 大冒险"
};
const DRAW_SOUND_SOURCES = [
  "audio/card-draw-1.mp3"
];

const cards = {
  truth: buildCards("truth", CARD_COUNTS.truth),
  dare: buildCards("dare", CARD_COUNTS.dare)
};

const piles = {
  truth: [],
  dare: []
};

resetPile("truth");
resetPile("dare");

let elements;
let audioContext;
let drawSounds = [];
let lastTrigger = null;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

function buildCards(type, count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return `${type}-cards/${type}-${number}.webp`;
  });
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function resetPile(type) {
  piles[type] = shuffle([...cards[type].keys()]);
}

function init() {
  elements = {
    overlay: document.getElementById("overlay"),
    flip: document.getElementById("cardFlip"),
    inner: document.getElementById("cardFlipInner"),
    back: document.getElementById("cardBack"),
    label: document.getElementById("cardLabel"),
    frontImg: document.getElementById("cardFrontImg")
  };

  document.querySelectorAll("[data-draw]").forEach((button) => {
    button.addEventListener("click", () => draw(button.dataset.draw));
  });

  elements.overlay.addEventListener("click", (event) => {
    if (event.target === elements.overlay) closeModal();
  });
  elements.flip.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (!elements.overlay.classList.contains("show")) return;
    if (event.key === "Escape") closeModal();
    if ((event.key === "Enter" || event.key === " ") && event.target === elements.flip) {
      event.preventDefault();
      closeModal();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      elements.flip.focus();
    }
  });

  window.draw = draw;
  drawSounds = DRAW_SOUND_SOURCES.map(createSound);
}

function draw(mode) {
  lastTrigger = document.activeElement;
  const type = mode === "random"
    ? (Math.random() < RANDOM_TRUTH_CHANCE ? "truth" : "dare")
    : mode;

  if (!cards[type]) return;
  playDrawSound();

  if (piles[type].length === 0) resetPile(type);

  const cardIndex = piles[type].pop();
  showCard(type, cards[type][cardIndex]);
}

function showCard(type, src) {
  elements.flip.hidden = false;
  elements.inner.style.transition = "none";
  elements.flip.classList.remove("flipped");
  elements.back.className = `flip-face flip-back ${type}-back`;
  elements.label.textContent = CARD_LABELS[type];
  const cardNumber = src.match(/-(\d+)\.webp$/)?.[1];
  elements.frontImg.alt = cardNumber
    ? `${CARD_LABELS[type]} 第${Number(cardNumber)}张`
    : CARD_LABELS[type];
  elements.frontImg.src = src;
  elements.overlay.classList.add("show");
  elements.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => elements.flip.focus({ preventScroll: true }));

  void elements.inner.offsetWidth;

  requestAnimationFrame(() => {
    elements.inner.style.transition = "";
    requestAnimationFrame(() => {
      elements.flip.classList.add("flipped");
      window.setTimeout(playRevealSound, 360);
    });
  });
}

function closeModal() {
  if (!elements.overlay.classList.contains("show")) return;
  elements.overlay.classList.remove("show");
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.flip.hidden = true;
  document.body.classList.remove("modal-open");
  if (lastTrigger && typeof lastTrigger.focus === "function") {
    lastTrigger.focus({ preventScroll: true });
  }
  lastTrigger = null;
}

function createSound(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.82;
  return audio;
}

function playDrawSound() {
  const source = drawSounds[Math.floor(Math.random() * drawSounds.length)];
  if (!source) return;

  const sound = source.cloneNode();
  sound.volume = source.volume;
  sound.play().catch(() => {});
}

function playRevealSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioContext = audioContext || new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const high = audioContext.createOscillator();
  const low = audioContext.createOscillator();

  high.type = "triangle";
  low.type = "sine";
  high.frequency.setValueAtTime(880, now);
  high.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
  low.frequency.setValueAtTime(220, now);
  low.frequency.exponentialRampToValueAtTime(330, now + 0.16);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  high.connect(gain);
  low.connect(gain);
  gain.connect(audioContext.destination);
  high.start(now);
  low.start(now);
  high.stop(now + 0.24);
  low.stop(now + 0.24);
}
