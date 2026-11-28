import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PickerSheet } from "./pickerSheet.component";
import { addDays, mondayIndex, monthGrid, monthOf, parseYmd, shiftMonth, ymdToIso } from "../utils/calendar";
import { formatDeparture } from "../utils/helpers";

// Choose a day from a month calendar (Monday first), or Today / Tomorrow in one tap.
// Days before `min` can't be chosen. Tapping a day chooses it and closes the sheet.
export function DatePickerSheet({ value, min, onSelect, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [shown, setShown] = useState(() => monthOf(value ?? min));

  const weeks = useMemo(() => monthGrid(shown.year, shown.month), [shown]);
  const months = t("picker.months", { returnObjects: true });
  const monthsOf = t("picker.monthsOf", { returnObjects: true });
  const weekdays = t("picker.weekdays", { returnObjects: true });
  const weekdaysShort = t("picker.weekdaysShort", { returnObjects: true });

  const canGoBack = shown.year > monthOf(min).year || (shown.year === monthOf(min).year && shown.month > monthOf(min).month);

  // "28-noyabr, shanba": what a screen reader says for a day
  const dayLabel = (ymd) => {
    const d = parseYmd(ymd);
    return t("picker.dayLabel", {
      day: d.getUTCDate(),
      month: monthsOf[d.getUTCMonth()],
      weekday: weekdays[mondayIndex(ymd)],
    });
  };

  const quick = [min, addDays(min, 1)]; // Today, Tomorrow

  return (
    <PickerSheet title={t("picker.date.title")} onClose={onClose}>
      {(close) => {
        const choose = (ymd) => close(() => onSelect(ymd));

        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              {quick.map((ymd) => {
                const { day, date } = formatDeparture(ymdToIso(ymd), lang);
                const selected = ymd === value;
                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => choose(ymd)}
                    aria-pressed={selected}
                    className={`flex flex-col items-start rounded-2xl px-3.5 py-2.5 text-left ring-1 transition active:scale-[0.98] ${
                      selected ? "bg-sky-500 text-white ring-sky-500" : "bg-slate-50 text-slate-900 ring-slate-100"
                    }`}
                  >
                    <span className="text-sm font-bold">{day}</span>
                    <span className={`text-[11px] font-medium ${selected ? "text-sky-100" : "text-slate-400"}`}>{date}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShown(shiftMonth(shown, -1))}
                disabled={!canGoBack}
                aria-label={t("picker.date.prevMonth")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition active:scale-90 active:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-sm font-bold text-slate-900" aria-live="polite">
                {months[shown.month]} {shown.year}
              </p>
              <button
                type="button"
                onClick={() => setShown(shiftMonth(shown, 1))}
                aria-label={t("picker.date.nextMonth")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition active:scale-90 active:bg-slate-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 text-center" aria-hidden="true">
              {weekdaysShort.map((w, i) => (
                <span key={w} className={`py-1 text-[11px] font-semibold ${i >= 5 ? "text-rose-400" : "text-slate-400"}`}>
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {weeks.flat().map((ymd, i) => {
                if (!ymd) return <span key={`blank-${i}`} />;
                const past = ymd < min;
                const selected = ymd === value;
                const today = ymd === min;
                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => choose(ymd)}
                    disabled={past}
                    aria-label={dayLabel(ymd)}
                    aria-pressed={selected}
                    className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition active:scale-90 disabled:active:scale-100 ${
                      selected
                        ? "bg-sky-500 font-bold text-white shadow-md shadow-sky-500/30"
                        : past
                          ? "text-slate-300"
                          : today
                            ? "font-bold text-sky-600 active:bg-slate-100"
                            : "font-medium text-slate-800 active:bg-slate-100"
                    }`}
                  >
                    {parseYmd(ymd).getUTCDate()}
                    {today && !selected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-sky-500" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        );
      }}
    </PickerSheet>
  );
}
