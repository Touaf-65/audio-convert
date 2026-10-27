import "./style.css";
import { LOCALES, getLocale, setLocale, onLocaleChange, translateDom, t, type Locale } from "./i18n";
import {
  BITRATES,
  DEFAULT_BITRATE,
  OUTPUT_FORMATS,
  getOutputFormat,
  getQualityWarning,
  outputFileName,
  type QualityWarning,
} from "./formats";
import { ConversionError, convert, isEngineLoaded, loadEngine } from "./converter";

type JobStatus = "pending" | "converting" | "done" | "error";

interface Job {
  id: number;
  file: File;
  status: JobStatus;
  progress: number;
  result?: { url: string; name: string; size: number };
  error?: string;
}

const SETTINGS_KEY = "audio-convert.settings";

const state = {
  jobs: [] as Job[],
  formatId: OUTPUT_FORMATS[0].id,
  bitrate: DEFAULT_BITRATE,
  running: false,
  engine: "idle" as "idle" | "loading" | "error",
};
let nextJobId = 1;

try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
  if (OUTPUT_FORMATS.some((format) => format.id === saved.formatId)) state.formatId = saved.formatId;
  if (BITRATES.includes(saved.bitrate)) state.bitrate = saved.bitrate;
} catch {
  // Réglages par défaut.
}

function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ formatId: state.formatId, bitrate: state.bitrate }));
  } catch {
    // Non mémorisé, sans conséquence.
  }
}

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="header">
    <div class="brand">
      <img src="/favicon.svg" alt="" width="32" height="32" />
      <h1 data-i18n="app.title"></h1>
    </div>
    <label class="lang">
      <span class="sr-only" data-i18n="lang.label"></span>
      <select id="lang-select">
        ${Object.entries(LOCALES)
          .map(([code, name]) => `<option value="${code}">${name}</option>`)
          .join("")}
      </select>
    </label>
  </header>

  <main class="main">
    <p class="tagline" data-i18n="app.tagline"></p>
    <p class="privacy" data-i18n="app.privacy"></p>

    <label class="dropzone" id="dropzone" for="file-input">
      <input id="file-input" type="file" accept="audio/*,video/*" multiple hidden />
      <strong data-i18n="dropzone.title"></strong>
      <span data-i18n="dropzone.hint"></span>
    </label>

    <section class="panel" id="panel" hidden>
      <div class="options">
        <label class="field">
          <span data-i18n="options.format"></span>
          <select id="format-select"></select>
        </label>
        <label class="field" id="bitrate-field">
          <span data-i18n="options.bitrate"></span>
          <select id="bitrate-select">
            ${BITRATES.map((rate) => `<option value="${rate}">${rate} kb/s</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="warnings" id="warnings"></div>

      <ul class="jobs" id="jobs"></ul>

      <p class="engine" id="engine" role="status"></p>

      <div class="actions">
        <button type="button" class="button secondary" id="clear-button" data-i18n="actions.clear"></button>
        <button type="button" class="button primary" id="convert-button"></button>
      </div>
    </section>
  </main>

  <footer class="footer" data-i18n="footer.engine"></footer>
`;

const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
const langSelect = $<HTMLSelectElement>("#lang-select");
const fileInput = $<HTMLInputElement>("#file-input");
const dropzone = $<HTMLLabelElement>("#dropzone");
const panel = $<HTMLElement>("#panel");
const formatSelect = $<HTMLSelectElement>("#format-select");
const bitrateField = $<HTMLLabelElement>("#bitrate-field");
const bitrateSelect = $<HTMLSelectElement>("#bitrate-select");
const warningsBox = $<HTMLDivElement>("#warnings");
const jobsList = $<HTMLUListElement>("#jobs");
const engineStatus = $<HTMLParagraphElement>("#engine");
const clearButton = $<HTMLButtonElement>("#clear-button");
const convertButton = $<HTMLButtonElement>("#convert-button");

function formatBytes(bytes: number): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

function renderFormatOptions(): void {
  formatSelect.innerHTML = OUTPUT_FORMATS.map(
    (format) => `<option value="${format.id}">${format.label} — ${t(`compression.${format.compression}`)}</option>`,
  ).join("");
  formatSelect.value = state.formatId;
  bitrateSelect.value = String(state.bitrate);
}

function renderWarnings(): void {
  const target = getOutputFormat(state.formatId);
  const counts = new Map<QualityWarning, number>();
  for (const job of state.jobs) {
    if (job.status === "done") continue;
    const warning = getQualityWarning(job.file.name, target);
    if (warning) counts.set(warning, (counts.get(warning) ?? 0) + 1);
  }
  warningsBox.replaceChildren(
    ...[...counts].map(([warning, count]) => {
      const p = document.createElement("p");
      p.className = "warning";
      p.textContent = t(`warning.${warning}`, { count });
      return p;
    }),
  );
}

function statusText(job: Job): string {
  switch (job.status) {
    case "pending":
      return t("status.pending");
    case "converting":
      return t("status.converting", { percent: Math.round(job.progress * 100) });
    case "done":
      return t("status.done", { size: formatBytes(job.result!.size) });
    case "error":
      return t("status.error", { message: job.error ?? "" });
  }
}

function renderJob(job: Job): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `job ${job.status}`;

  const info = document.createElement("div");
  info.className = "job-info";
  const name = document.createElement("span");
  name.className = "job-name";
  name.textContent = job.file.name;
  name.title = job.file.name;
  const meta = document.createElement("span");
  meta.className = "job-meta";
  meta.textContent = `${formatBytes(job.file.size)} · ${statusText(job)}`;
  info.append(name, meta);

  const progress = document.createElement("progress");
  progress.max = 1;
  progress.value = job.status === "done" ? 1 : job.progress;
  progress.hidden = job.status !== "converting";

  const actions = document.createElement("div");
  actions.className = "job-actions";
  if (job.result) {
    const link = document.createElement("a");
    link.className = "button primary small";
    link.href = job.result.url;
    link.download = job.result.name;
    link.textContent = t("actions.download");
    actions.append(link);
  }
  if (job.status !== "converting") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button ghost small";
    remove.textContent = "✕";
    remove.title = t("actions.remove");
    remove.setAttribute("aria-label", `${t("actions.remove")} ${job.file.name}`);
    remove.disabled = state.running;
    remove.addEventListener("click", () => removeJob(job.id));
    actions.append(remove);
  }

  li.append(info, actions, progress);
  return li;
}

function render(): void {
  panel.hidden = state.jobs.length === 0;
  bitrateField.hidden = getOutputFormat(state.formatId).compression !== "lossy";
  formatSelect.disabled = state.running;
  bitrateSelect.disabled = state.running;
  jobsList.replaceChildren(...state.jobs.map(renderJob));
  renderWarnings();

  const pending = state.jobs.filter((job) => job.status !== "converting").length;
  convertButton.disabled = state.running || pending === 0;
  convertButton.textContent = state.running ? t("actions.converting") : t("actions.convert", { count: pending });
  clearButton.disabled = state.running;

  engineStatus.textContent =
    state.engine === "loading" ? t("engine.loading") : state.engine === "error" ? t("engine.error") : "";
  engineStatus.classList.toggle("error", state.engine === "error");
}

/** Met à jour une seule ligne pendant la conversion, sans reconstruire toute la liste. */
function renderJobInPlace(job: Job): void {
  const index = state.jobs.indexOf(job);
  jobsList.children[index]?.replaceWith(renderJob(job));
}

function revoke(job: Job): void {
  if (job.result) URL.revokeObjectURL(job.result.url);
}

function addFiles(files: FileList | File[]): void {
  for (const file of files) {
    state.jobs.push({ id: nextJobId++, file, status: "pending", progress: 0 });
  }
  render();
  // Le moteur pèse ~30 Mo : on commence à le télécharger dès qu'il y a quelque chose à convertir.
  if (!isEngineLoaded()) void ensureEngine();
}

function removeJob(id: number): void {
  const job = state.jobs.find((item) => item.id === id);
  if (job) revoke(job);
  state.jobs = state.jobs.filter((item) => item.id !== id);
  render();
}

async function ensureEngine(): Promise<boolean> {
  if (isEngineLoaded()) return true;
  state.engine = "loading";
  render();
  try {
    await loadEngine();
    state.engine = "idle";
    return true;
  } catch (error) {
    console.error(error);
    state.engine = "error";
    return false;
  } finally {
    render();
  }
}

async function convertAll(): Promise<void> {
  if (state.running) return;
  state.running = true;
  render();

  const target = getOutputFormat(state.formatId);
  const options = { bitrate: state.bitrate };

  if (await ensureEngine()) {
    // Tout est (re)converti avec les réglages actuels, y compris les fichiers déjà faits.
    for (const job of state.jobs) {
      if (!state.jobs.includes(job)) continue;
      revoke(job);
      job.result = undefined;
      job.error = undefined;
      job.status = "converting";
      job.progress = 0;
      renderJobInPlace(job);

      try {
        const blob = await convert(job.file, target, options, (ratio) => {
          job.progress = ratio;
          renderJobInPlace(job);
        });
        job.result = { url: URL.createObjectURL(blob), name: outputFileName(job.file.name, target), size: blob.size };
        job.status = "done";
      } catch (error) {
        console.error(error);
        job.status = "error";
        job.error = error instanceof ConversionError ? error.message : t("status.unknownError");
      }
      renderJobInPlace(job);
    }
  }

  state.running = false;
  render();
}

langSelect.value = getLocale();
langSelect.addEventListener("change", () => setLocale(langSelect.value as Locale));

fileInput.addEventListener("change", () => {
  if (fileInput.files) addFiles(fileInput.files);
  fileInput.value = "";
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
});

formatSelect.addEventListener("change", () => {
  state.formatId = formatSelect.value;
  saveSettings();
  render();
});
bitrateSelect.addEventListener("change", () => {
  state.bitrate = Number(bitrateSelect.value);
  saveSettings();
});

convertButton.addEventListener("click", () => void convertAll());
clearButton.addEventListener("click", () => {
  state.jobs.forEach(revoke);
  state.jobs = [];
  render();
});

onLocaleChange(() => {
  translateDom(app);
  renderFormatOptions();
  render();
});
setLocale(getLocale());
