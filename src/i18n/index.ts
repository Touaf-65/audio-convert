import { fr, type MessageKey } from "./fr";
import { en } from "./en";

export const LOCALES = { fr: "Français", en: "English" } as const;
export type Locale = keyof typeof LOCALES;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { fr, en };
const STORAGE_KEY = "audio-convert.locale";

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Stockage indisponible (navigation privée, etc.) : on se rabat sur le navigateur.
  }
  const browser = navigator.language.slice(0, 2);
  return isLocale(browser) ? browser : "fr";
}

let current: Locale = detectLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // La préférence ne sera simplement pas mémorisée.
  }
  listeners.forEach((listener) => listener());
}

export function onLocaleChange(listener: () => void): void {
  listeners.add(listener);
}

/** Traduit une clé ; les marqueurs `{nom}` sont remplacés par `params.nom`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Remplit tous les éléments portant un attribut `data-i18n` avec leur traduction. */
export function translateDom(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as MessageKey);
  });
}
