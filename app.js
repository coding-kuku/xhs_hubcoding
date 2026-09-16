const MODES = {
  normal: {
    kicker: "中价柜 · 中标后开仓",
    title: "旧港转运留置物",
    chip: "常规开仓",
    gesture: "按住封签，向下扯断",
    hint: "动作到位就触发，不设置操作失败",
    note: "日常柜：封签 → 锁杆 → 开门 → 扫光清点"
  },
  combined: {
    kicker: "雾柜 · 竞拍前揭露一层",
    title: "缆绳封幕柜",
    chip: "未知等级",
    gesture: "第一步：快速划过中央绳结",
    hint: "断绳只是解锁；随后还要亲手揭开帷幕",
    note: "完整动作：断绳卸力 → 帷幕角翘起 → 斜向揭幕 → 显示一条线索"
  }
};

const CLUES = [
  "内部有规律金属碰撞声",
  "帷幕后出现一角木质雕花",
  "箱门内侧残留低温水汽",
  "能闻到微弱机油与旧皮革味"
];

const scene = document.querySelector("#scene");
const container = document.querySelector("#container");
const seal = document.querySelector("#seal");
const peelTab = document.querySelector("#peelTab");
const ropeLayer = document.querySelector("#ropeLayer");
const cutTrail = document.querySelector("#cutTrail");
const clueText = document.querySelector("#clueText");
const progressRing = document.querySelector("#progressRing");
const progressText = document.querySelector("#progressText");
const gestureTitle = document.querySelector("#gestureTitle");
const gestureHint = document.querySelector("#gestureHint");
const resultStrip = document.querySelector("#resultStrip");
const resetButton = document.querySelector("#resetButton");
const modeButtons = [...document.querySelectorAll(".mode-button")];

let mode = "normal";
let step = "seal";
let pointerStart = null;
let maximumProgress = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setProgress(value) {
  const normalized = clamp(Math.round(value), 0, 100);
  maximumProgress = Math.max(maximumProgress, normalized);
  progressRing.style.setProperty("--progress", `${normalized * 3.6}deg`);
  progressText.textContent = `${normalized}%`;
}

function updateCopy(nextMode) {
  const copy = MODES[nextMode];
  document.querySelector("#stageKicker").textContent = copy.kicker;
  document.querySelector("#stageTitle").textContent = copy.title;
  document.querySelector("#riskChip").textContent = copy.chip;
  gestureTitle.textContent = copy.gesture;
  gestureHint.textContent = copy.hint;
  document.querySelector("#footerNote").textContent = copy.note;
}

function clearInteractionStyles() {
  seal.style.transform = "";
  document.querySelector(".door-left").style.transform = "";
  document.querySelector(".door-right").style.transform = "";
  document.querySelector("#veil").style.clipPath = "";
  peelTab.style.transform = "";
  cutTrail.style.display = "none";
  cutTrail.style.width = "0";
}

function reset(nextMode = mode) {
  mode = nextMode;
  step = mode === "normal" ? "seal" : mode === "combined" ? "cut" : mode;
  pointerStart = null;
  maximumProgress = 0;
  container.className = `container mode-${mode}`;
  resultStrip.style.display = "none";
  clueText.textContent = CLUES[Math.floor(Math.random() * CLUES.length)];
  clearInteractionStyles();
  setProgress(0);
  updateCopy(mode);
  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

function localPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
}

function revealFog() {
  if (container.classList.contains("is-revealed")) return;
  container.classList.add("is-revealed");
  step = "done";
  setProgress(100);
  gestureTitle.textContent = "第一层线索已揭露";
  gestureHint.textContent = "线索只缩小判断范围，不承诺柜内价值";
  window.setTimeout(() => {
    resultStrip.style.display = "grid";
    resultStrip.querySelector("strong").textContent = "仍然未知";
    resultStrip.querySelector("span").textContent = "竞拍成功后才进行完整开仓";
  }, 520);
}

function completeSeal() {
  if (step !== "seal") return;
  container.classList.add("is-seal-broken");
  step = "door";
  setProgress(0);
  gestureTitle.textContent = "横向滑动，拉开两扇柜门";
  gestureHint.textContent = "门体先吃力、后突然卸力，形成重量感";
}

function completeDoor() {
  if (step !== "door") return;
  container.classList.add("is-open");
  step = "done";
  setProgress(100);
  gestureTitle.textContent = "开仓完成，正在逐件清点";
  gestureHint.textContent = "先见轮廓，再扫光，再按稀有度出现结果";
  window.setTimeout(() => {
    resultStrip.style.display = "grid";
    resultStrip.querySelector("strong").textContent = "4 件待估价";
    resultStrip.querySelector("span").textContent = "不会一开门就把所有价格同时砸到脸上";
  }, 950);
}

function beginNormal(event) {
  if (mode !== "normal" || step === "done") return;
  pointerStart = { x: event.clientX, y: event.clientY };
  scene.setPointerCapture(event.pointerId);
}

function moveNormal(event) {
  if (mode !== "normal" || !pointerStart) return;
  if (step === "seal") {
    const distance = clamp(event.clientY - pointerStart.y, 0, 95);
    seal.style.transform = `translateX(-50%) translateY(${distance}px) rotate(${-distance * .06}deg)`;
    setProgress((distance / 72) * 100);
  } else if (step === "door") {
    const distance = Math.abs(event.clientX - pointerStart.x);
    const openness = clamp(distance / 90, 0, 1);
    document.querySelector(".door-left").style.transform = `rotateY(${-85 * openness}deg)`;
    document.querySelector(".door-right").style.transform = `rotateY(${85 * openness}deg)`;
    setProgress(openness * 100);
  }
}

function endNormal(event) {
  if (mode !== "normal" || !pointerStart) return;
  if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
  const dx = Math.abs(event.clientX - pointerStart.x);
  const dy = event.clientY - pointerStart.y;
  if (step === "seal" && dy > 58) {
    completeSeal();
  } else if (step === "seal") {
    seal.style.transform = "";
    setProgress(0);
  } else if (step === "door" && dx > 62) {
    document.querySelector(".door-left").style.transform = "";
    document.querySelector(".door-right").style.transform = "";
    completeDoor();
  } else if (step === "door") {
    document.querySelector(".door-left").style.transform = "";
    document.querySelector(".door-right").style.transform = "";
    setProgress(0);
  }
  pointerStart = null;
}

function beginPeel(event) {
  if (mode !== "combined" || step !== "peel") return;
  pointerStart = { x: event.clientX, y: event.clientY };
  peelTab.setPointerCapture(event.pointerId);
}

function movePeel(event) {
  if (mode !== "combined" || !pointerStart || step !== "peel") return;
  const dx = clamp(event.clientX - pointerStart.x, 0, 250);
  const dy = clamp(event.clientY - pointerStart.y, 0, 180);
  const distance = Math.hypot(dx, dy * 1.25);
  const progress = clamp((distance / 220) * 100, 0, 100);
  peelTab.style.transform = `translate(${dx * .7}px, ${dy * .7}px) rotate(${progress * .22}deg)`;
  document.querySelector("#veil").style.clipPath = `polygon(${progress * .72}% 0, 100% 0, 100% 100%, 0 100%, 0 ${progress * .9}%)`;
  setProgress(progress);
  if (progress >= 100) revealFog();
}

function endPeel(event) {
  if (mode !== "combined" || !pointerStart) return;
  if (peelTab.hasPointerCapture(event.pointerId)) peelTab.releasePointerCapture(event.pointerId);
  if (step !== "done") {
    peelTab.style.transform = "";
    document.querySelector("#veil").style.clipPath = "";
    setProgress(0);
  }
  pointerStart = null;
}

function beginCut(event) {
  if (mode !== "combined" || step !== "cut") return;
  const point = localPoint(event, container);
  pointerStart = { x: point.x, y: point.y, clientX: event.clientX, clientY: event.clientY };
  ropeLayer.setPointerCapture(event.pointerId);
  cutTrail.style.display = "block";
  cutTrail.style.left = `${point.x}px`;
  cutTrail.style.top = `${point.y}px`;
}

function moveCut(event) {
  if (mode !== "combined" || !pointerStart || step !== "cut") return;
  const point = localPoint(event, container);
  const dx = point.x - pointerStart.x;
  const dy = point.y - pointerStart.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  cutTrail.style.width = `${distance}px`;
  cutTrail.style.transform = `rotate(${angle}deg)`;
  setProgress(clamp((distance / 125) * 100, 0, 100));
}

function endCut(event) {
  if (mode !== "combined" || !pointerStart) return;
  if (ropeLayer.hasPointerCapture(event.pointerId)) ropeLayer.releasePointerCapture(event.pointerId);
  const point = localPoint(event, container);
  const distance = Math.hypot(point.x - pointerStart.x, point.y - pointerStart.y);
  const centerY = container.clientHeight * .47;
  const crossedKnot = Math.min(pointerStart.y, point.y) < centerY + 55 && Math.max(pointerStart.y, point.y) > centerY - 55;
  cutTrail.style.display = "none";
  if (distance > 88 && crossedKnot) {
    container.classList.add("is-cut");
    setProgress(100);
    step = "peel";
    window.setTimeout(() => {
      setProgress(0);
      gestureTitle.textContent = "第二步：抓住翘角，斜向揭幕";
      gestureHint.textContent = "绳索卸力后帷幕才可移动，两个动作连成一次仪式";
    }, 470);
  } else {
    setProgress(0);
  }
  pointerStart = null;
}

scene.addEventListener("pointerdown", beginNormal);
scene.addEventListener("pointermove", moveNormal);
scene.addEventListener("pointerup", endNormal);
scene.addEventListener("pointercancel", endNormal);

peelTab.addEventListener("pointerdown", beginPeel);
peelTab.addEventListener("pointermove", movePeel);
peelTab.addEventListener("pointerup", endPeel);
peelTab.addEventListener("pointercancel", endPeel);

ropeLayer.addEventListener("pointerdown", beginCut);
ropeLayer.addEventListener("pointermove", moveCut);
ropeLayer.addEventListener("pointerup", endCut);
ropeLayer.addEventListener("pointercancel", endCut);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => reset(button.dataset.mode));
});

resetButton.addEventListener("click", () => reset(mode));
reset("normal");
