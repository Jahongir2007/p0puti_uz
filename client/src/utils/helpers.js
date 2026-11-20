import i18n from "../i18n";

export const TASHKENT_OFFSET = 5 * 60 * 60 * 1000; // UTC+5, no DST

const LOCALE = {
  uz: {
    today: "Bugun",
    tomorrow: "Ertaga",
    weekdays: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
    months: ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"],
    date: (day, month) => `${day}-${month}`, // 5-noy
  },
  ru: {
    today: "Сегодня",
    tomorrow: "Завтра",
    weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    // genitive short forms: "5 ноя", "1 мая"
    months: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    date: (day, month) => `${day} ${month}`, // 5 ноя
  },
};

export function formatDeparture(iso, lang = i18n.resolvedLanguage) {
  const L = LOCALE[lang] ?? LOCALE.uz;

  const ms = new Date(iso).getTime();
  const d = new Date(ms + TASHKENT_OFFSET); // read with getUTC* = Tashkent wall clock

  const dayIndex = (t) => Math.floor((t + TASHKENT_OFFSET) / 86400000);
  const diff = dayIndex(ms) - dayIndex(Date.now()); // 0 = today, 1 = tomorrow

  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");

  return {
    day: diff === 0 ? L.today : diff === 1 ? L.tomorrow : L.weekdays[d.getUTCDay()],
    date: L.date(d.getUTCDate(), L.months[d.getUTCMonth()]),
    time: `${hh}:${mm}`,
  };
}