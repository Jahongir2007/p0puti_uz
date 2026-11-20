import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

const SUPPORTED = ["uz", "ru"];
const tg = window.Telegram?.WebApp;
const hasCloud = !!tg?.CloudStorage && tg.isVersionAtLeast?.("6.9");

function defaultLang() {
  const code = tg?.initDataUnsafe?.user?.language_code;
  return code === "ru" ? "ru" : "uz";
}

export function loadLanguage() {
  return new Promise((resolve) => {
    const fallback = () => {
      try {
        const saved = localStorage.getItem("lang");
        resolve(SUPPORTED.includes(saved) ? saved : defaultLang());
      } catch {
        resolve(defaultLang());
      }
    };

    if (!hasCloud) return fallback();

    tg.CloudStorage.getItem("lang", (err, value) => {
      if (err || !SUPPORTED.includes(value)) return fallback();
      resolve(value);
    });
  });
}

export function saveLanguage(code) {
  try {
    localStorage.setItem("lang", code);
  } catch {}
  if (hasCloud) tg.CloudStorage.setItem("lang", code, () => {});
}

i18n
  .use(initReactI18next)
  .use(resourcesToBackend((lng, ns) => import(`./locales/${lng}/${ns}.json`)))
  .init({
    lng: "uz",
    fallbackLng: "uz",
    supportedLngs: SUPPORTED,
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

// Apply the saved language once at startup, for every page
loadLanguage().then((code) => i18n.changeLanguage(code));

export default i18n;