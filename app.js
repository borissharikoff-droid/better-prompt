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
const uiKicker = document.getElementById("uiKicker");
const uiHeroTitle = document.getElementById("uiHeroTitle");
const uiHeroSubtitle = document.getElementById("uiHeroSubtitle");
const uiProjects = document.getElementById("uiProjects");
const uiCollections = document.getElementById("uiCollections");
const uiProjectName = document.getElementById("uiProjectName");
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
const outputConfig = config.output || {};
const toastConfig = config.toast || {};
const ui = config.ui || {};

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

if (uiTitle && ui.title) uiTitle.textContent = ui.title;
if (uiSubtitle && ui.subtitle) uiSubtitle.textContent = ui.subtitle;
if (uiKicker && ui.heroKicker) uiKicker.textContent = ui.heroKicker;
if (uiHeroTitle && ui.heroTitle) uiHeroTitle.textContent = ui.heroTitle;
if (uiHeroSubtitle && ui.heroSubtitle) uiHeroSubtitle.textContent = ui.heroSubtitle;
if (uiProjects && ui.projectsTitle) uiProjects.textContent = ui.projectsTitle;
if (uiCollections && ui.collectionsTitle) uiCollections.textContent = ui.collectionsTitle;
if (uiProjectName && ui.projectName) uiProjectName.textContent = ui.projectName;
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
