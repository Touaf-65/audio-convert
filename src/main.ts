import "./style.css";
import { LOCALES, getLocale, setLocale, onLocaleChange, translateDom, type Locale } from "./i18n";

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

    <label class="dropzone" for="file-input">
      <input id="file-input" type="file" accept="audio/*,video/*" multiple hidden />
      <strong data-i18n="dropzone.title"></strong>
      <span data-i18n="dropzone.hint"></span>
    </label>
  </main>

  <footer class="footer" data-i18n="footer.engine"></footer>
`;

const langSelect = app.querySelector<HTMLSelectElement>("#lang-select")!;
langSelect.value = getLocale();
langSelect.addEventListener("change", () => setLocale(langSelect.value as Locale));

onLocaleChange(() => translateDom(app));
setLocale(getLocale());
