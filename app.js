const inputPrompt = document.getElementById("inputPrompt");
const outputPrompt = document.getElementById("outputPrompt");
const pasteBtn = document.getElementById("pasteBtn");
const confirmBtn = document.getElementById("confirmBtn");
const copyBtn = document.getElementById("copyBtn");
const statusText = document.getElementById("statusText");
const memeText = document.getElementById("memeText");
const toast = document.getElementById("toast");

const config = window.BetterPromptConfig || {};
const statusStages = config.statusStages || [];
const memeLines = config.memeLines || [];
const idle = config.idle || {};
const loading = config.loading || {};
const outputConfig = config.output || {};
const toastConfig = config.toast || {};

let dotTimer = null;
let stageTimer = null;
let memeTimer = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setStatusIdle(message) {
  statusText.textContent = message || idle.defaultStatus || "";
  memeText.textContent = idle.defaultMeme || "";
}

function startLoading() {
  let dots = 1;
  let stageIndex = 0;

  statusText.textContent = `${statusStages[stageIndex]}.`;
  memeText.textContent = memeLines[0] || "";

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
    memeText.textContent = memeLines[memeIndex];
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

function enhancePrompt(raw) {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  const timestamp = new Date().toLocaleString(
    outputConfig.locale || "ru-RU",
    outputConfig.timestampOptions || { dateStyle: "short", timeStyle: "short" }
  );

  const lines = (outputConfig.templateLines || []).map((line) =>
    line
      .replace("{{input}}", `"${cleaned}"`)
      .replace("{{timestamp}}", timestamp)
  );

  return lines.join("\n");
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

  try {
    await navigator.clipboard.writeText(text);
    outputPrompt.classList.add("copied");
    showToast();
    setTimeout(() => outputPrompt.classList.remove("copied"), 1200);
  } catch (error) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(outputPrompt);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    outputPrompt.classList.add("copied");
    showToast();
    setTimeout(() => outputPrompt.classList.remove("copied"), 1200);
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

  await sleep(loading.totalDelayMs || 3200);

  stopLoading();
  const enhanced = enhancePrompt(raw);
  outputPrompt.textContent = enhanced;
  setStatusIdle(idle.done);

  confirmBtn.disabled = false;
  pasteBtn.disabled = false;
  copyBtn.disabled = false;
}

if (toastConfig.copied) {
  toast.textContent = toastConfig.copied;
}

setStatusIdle(idle.defaultStatus);

pasteBtn.addEventListener("click", handlePaste);
confirmBtn.addEventListener("click", handleConfirm);
copyBtn.addEventListener("click", copyOutput);
outputPrompt.addEventListener("click", copyOutput);
