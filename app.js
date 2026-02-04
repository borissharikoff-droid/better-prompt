const inputPrompt = document.getElementById("inputPrompt");
const outputPrompt = document.getElementById("outputPrompt");
const pasteBtn = document.getElementById("pasteBtn");
const confirmBtn = document.getElementById("confirmBtn");
const copyBtn = document.getElementById("copyBtn");
const statusText = document.getElementById("statusText");
const memeText = document.getElementById("memeText");
const toast = document.getElementById("toast");
const outputHint = document.getElementById("outputHint");
const telegramBtn = document.getElementById("telegramBtn");

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


function setStatusIdle(message) {
  const text = message || idle.defaultStatus || "";
  statusText.textContent = text;
  statusText.classList.toggle("is-hidden", !text);
  memeText.textContent = idle.defaultMeme || "";
}

function startLoading() {
  let dots = 1;
  let stageIndex = 0;

  statusText.textContent = `${statusStages[stageIndex]}.`;
  statusText.classList.remove("is-hidden");
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

  return (payload.output || "").trim();
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

  try {
    const improved = await requestImprovedPrompt(raw);
    outputPrompt.textContent = improved || idle.errorOutput || "";
    setStatusIdle(improved ? idle.done : idle.error);
  } catch (error) {
    outputPrompt.textContent = idle.errorOutput || "";
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
