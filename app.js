const inputPrompt = document.getElementById("inputPrompt");
const outputPrompt = document.getElementById("outputPrompt");
const pasteBtn = document.getElementById("pasteBtn");
const confirmBtn = document.getElementById("confirmBtn");
const copyBtn = document.getElementById("copyBtn");
const statusText = document.getElementById("statusText");
const memeText = document.getElementById("memeText"); // may be null in redesigned layout
const toast = document.getElementById("toast");
const outputHint = document.getElementById("outputHint");
const telegramBtn = document.getElementById("telegramBtn");
const scorePanel = document.getElementById("scorePanel");
const scoreTitle = document.getElementById("scoreTitle");
const scoreItems = Array.from(document.querySelectorAll(".score-item"));

const uiTitle = document.getElementById("uiTitle");
const uiSubtitle = document.getElementById("uiSubtitle");
const uiInputTitle = document.getElementById("uiInputTitle");
const uiInputMeta = document.getElementById("uiInputMeta");
const uiInputLabel = document.getElementById("uiInputLabel");
const uiOutputTitle = document.getElementById("uiOutputTitle");
const uiOutputMeta = document.getElementById("uiOutputMeta");

const config = window.BetterPromptConfig || {};
const statusStages = config.statusStages || [];
const memeLines = config.memeLines || [];
const idle = config.idle || {};
const loading = config.loading || {};
const toastConfig = config.toast || {};
const ui = config.ui || {};
const apiConfig = config.api || {};

let dotTimer = null;
let stageTimer = null;
let memeTimer = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function computeScores(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { efficiency: 0, length: 0, clarity: 0, structure: 0 };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = wordCount / sentenceCount;

  const lengthScore = clamp(100 - Math.abs(wordCount - 180) * 0.35, 45, 95);
  const clarityScore = clamp(100 - Math.abs(avgSentenceLength - 18) * 3, 50, 96);

  let structureScore = 40;
  if (trimmed.includes("\n")) structureScore += 15;
  if (/^\s*(\d+\.|-|•)/m.test(trimmed)) structureScore += 30;
  if (/^\s*[А-ЯA-Z].+:\s*$/m.test(trimmed)) structureScore += 10;
  if (trimmed.split("\n\n").length >= 2) structureScore += 10;
  structureScore = clamp(structureScore, 45, 98);

  let efficiencyScore = (lengthScore + clarityScore + structureScore) / 3;
  if (/(сделай|сформируй|дай|создай|опиши|предложи|формат|вывод)/i.test(trimmed)) {
    efficiencyScore += 6;
  }
  efficiencyScore = clamp(efficiencyScore, 50, 98);

  return {
    efficiency: Math.round(efficiencyScore),
    length: Math.round(lengthScore),
    clarity: Math.round(clarityScore),
    structure: Math.round(structureScore),
  };
}

function applyScores(scores) {
  if (!scorePanel) return;
  scorePanel.classList.remove("is-hidden");

  scoreItems.forEach((item) => {
    const key = item.dataset.key;
    const value = scores[key];
    const labelEl = item.querySelector(".score-label");
    const valueEl = item.querySelector(".score-value");
    const fillEl = item.querySelector(".score-fill");

    if (labelEl && ui.scoreLabels && ui.scoreLabels[key]) {
      labelEl.textContent = ui.scoreLabels[key];
    }

    const displayValue = Number.isFinite(value) ? Math.round(value) : 0;
    if (valueEl) valueEl.textContent = `${displayValue}%`;
    if (fillEl) fillEl.style.width = `${displayValue}%`;
  });
}


function setStatusIdle(message) {
  const text = message || idle.defaultStatus || "";
  statusText.textContent = text;
  statusText.classList.toggle("is-hidden", !text);
  if (memeText) memeText.textContent = idle.defaultMeme || "";
}

function startLoading() {
  let dots = 1;
  let stageIndex = 0;

  statusText.textContent = `${statusStages[stageIndex]}.`;
  statusText.classList.remove("is-hidden");
  if (memeText) memeText.textContent = memeLines[0] || "";

  dotTimer = setInterval(() => {
    dots = dots % 3 + 1;
    statusText.textContent = `${statusStages[stageIndex]}${".".repeat(dots)}`;
  }, loading.dotIntervalMs || 450);

  stageTimer = setInterval(() => {
    stageIndex = (stageIndex + 1) % statusStages.length;
  }, loading.stageIntervalMs || 1400);

  let memeIndex = 0;
  memeTimer = setInterval(() => {
    memeIndex = (memeIndex + 1) % memeLines.length;
    if (memeText) memeText.textContent = memeLines[memeIndex];
  }, loading.memeIntervalMs || 1600);
}

function stopLoading() {
  clearInterval(dotTimer);
  clearInterval(stageTimer);
  clearInterval(memeTimer);
  dotTimer = null;
  stageTimer = null;
  memeTimer = null;
}

async function requestImprovedPrompt(raw) {
  const endpoint = apiConfig.endpoint || "/api/improve";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: raw }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return {
    output: (payload.output || "").trim(),
    scores: payload.scores || null,
  };
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputPrompt.value = text;
      setStatusIdle(idle.pasted);
    } else {
      setStatusIdle(idle.emptyClipboard);
    }
  } catch (error) {
    setStatusIdle(idle.clipboardError);
  }
}

function showToast() {
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

async function copyOutput() {
  const text = outputPrompt.textContent.trim();
  if (!text) {
    return;
  }

  const originalLabel = ui.copyLabel || "Скопировать";

  try {
    await navigator.clipboard.writeText(text);
    outputPrompt.classList.add("copied");
    copyBtn.textContent = toastConfig.copied || "Скопировано";
    showToast();
    setTimeout(() => {
      outputPrompt.classList.remove("copied");
      copyBtn.textContent = originalLabel;
    }, 3000);
  } catch (error) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(outputPrompt);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    outputPrompt.classList.add("copied");
    copyBtn.textContent = toastConfig.copied || "Скопировано";
    showToast();
    setTimeout(() => {
      outputPrompt.classList.remove("copied");
      copyBtn.textContent = originalLabel;
    }, 3000);
  }
}

async function handleConfirm() {
  const raw = inputPrompt.value.trim();
  if (!raw) {
    setStatusIdle(idle.noPrompt);
    inputPrompt.focus();
    return;
  }

  confirmBtn.disabled = true;
  pasteBtn.disabled = true;
  copyBtn.disabled = true;
  startLoading();

  try {
    const result = await requestImprovedPrompt(raw);
    const improved = result.output;
    outputPrompt.textContent = improved || idle.errorOutput || "";
    if (improved) {
      const scores = result.scores || computeScores(improved);
      applyScores(scores);
      setStatusIdle(idle.done);
    } else {
      if (scorePanel) scorePanel.classList.add("is-hidden");
      setStatusIdle(idle.error);
    }
  } catch (error) {
    outputPrompt.textContent = idle.errorOutput || "";
    if (scorePanel) scorePanel.classList.add("is-hidden");
    setStatusIdle(idle.error);
  } finally {
    stopLoading();
  }

  confirmBtn.disabled = false;
  pasteBtn.disabled = false;
  copyBtn.disabled = false;
}

if (toastConfig.copied) {
  toast.textContent = toastConfig.copied;
}

if (uiTitle && ui.title) uiTitle.textContent = ui.title;
if (uiSubtitle && ui.subtitle) uiSubtitle.textContent = ui.subtitle;
if (uiInputTitle && ui.inputTitle) uiInputTitle.textContent = ui.inputTitle;
if (uiInputMeta && ui.inputMeta) uiInputMeta.textContent = ui.inputMeta;
if (uiInputLabel && ui.inputLabel) uiInputLabel.textContent = ui.inputLabel;
if (uiOutputTitle && ui.outputTitle) uiOutputTitle.textContent = ui.outputTitle;
if (uiOutputMeta && ui.outputMeta) uiOutputMeta.textContent = ui.outputMeta;
if (outputHint && ui.outputHint) outputHint.textContent = ui.outputHint;
if (scoreTitle && ui.scoreTitle) scoreTitle.textContent = ui.scoreTitle;
if (pasteBtn && ui.pasteLabel) pasteBtn.textContent = ui.pasteLabel;
if (confirmBtn && ui.confirmLabel) confirmBtn.textContent = ui.confirmLabel;
if (copyBtn && ui.copyLabel) copyBtn.textContent = ui.copyLabel;
if (telegramBtn && ui.telegramLabel) telegramBtn.textContent = ui.telegramLabel;
if (telegramBtn && config.telegramUrl) telegramBtn.href = config.telegramUrl;
if (inputPrompt && ui.inputPlaceholder) inputPrompt.placeholder = ui.inputPlaceholder;

setStatusIdle(idle.defaultStatus);

pasteBtn.addEventListener("click", handlePaste);
confirmBtn.addEventListener("click", handleConfirm);
copyBtn.addEventListener("click", copyOutput);
outputPrompt.addEventListener("click", copyOutput);
inputPrompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleConfirm();
  }
});
