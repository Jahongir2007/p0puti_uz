import locations from "../data/locations.json";
import { normalize } from "./normalize";

const REGION_RU = {
  "andijon viloyati": "Андижанская область",
  "buxoro viloyati": "Бухарская область",
  "jizzax viloyati": "Джизакская область",
  "qashqadaryo viloyati": "Кашкадарьинская область",
  "navoiy viloyati": "Навоийская область",
  "namangan viloyati": "Наманганская область",
  "samarqand viloyati": "Самаркандская область",
  "surxondaryo viloyati": "Сурхандарьинская область",
  "sirdaryo viloyati": "Сырдарьинская область",
  "toshkent viloyati": "Ташкентская область",
  "toshkent shahri": "город Ташкент",
  "fargona viloyati": "Ферганская область",
  "xorazm viloyati": "Хорезмская область",
  "qoraqalpogiston respublikasi": "Республика Каракалпакстан",
};

// Latin letters that look like Cyrillic ones ("Улугноpский" has a Latin p)
const LOOKALIKES = { a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", k: "к", m: "м", t: "т",
  A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х" };

function fixMixedScript(s) {
  if (!/[а-яё]/i.test(s)) return s; // pure Latin: leave alone
  return s.replace(/[a-zA-Z]/g, (ch) => LOOKALIKES[ch] ?? ch);
}

export const INDEX = locations.map((l) => {
  const alt = (l.alt ?? []).map(fixMixedScript);
  const nameUzCyrl = alt[0];
  const nameRu = l.nameRu ?? alt[1];

  return {
    ...l,
    alt,
    nameUzCyrl,
    nameRu,
    regionRu: REGION_RU[normalize(l.region)] ?? l.region,
    keys: [l.name, ...alt].filter(Boolean).map(normalize),
  };
});

const BY_NAME = new Map(INDEX.map((l) => [l.name, l]));

export const findLocation = (name) => BY_NAME.get(name);

export function displayName(l, lang) {
  if (lang === "ru") return l.nameRu ?? l.name;
  if (lang === "uz-Cyrl") return l.nameUzCyrl ?? l.name;
  return l.name;
}

export function localizedName(name, lang) {
  const l = BY_NAME.get(name);
  return l ? displayName(l, lang) : name; // free text → show as saved
}

export function localizedRegion(l, lang) {
  return lang === "ru" ? l.regionRu : l.region;
}

export function searchLocations(query, limit = 8) {
  const q = normalize(query);
  if (q.length < 2) return [];

  const starts = [];
  const contains = [];
  for (const l of INDEX) {
    if (l.keys.some((k) => k.startsWith(q))) starts.push(l);
    else if (l.keys.some((k) => k.includes(q))) contains.push(l);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function exactLocation(query) {
  const q = normalize(query);
  return INDEX.find((l) => l.keys.includes(q));
}