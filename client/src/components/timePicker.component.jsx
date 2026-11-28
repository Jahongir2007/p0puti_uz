import { Check, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PickerSheet } from "./pickerSheet.component";

const PARTS = [
  { key: "night", from: 0 },
  { key: "morning", from: 6 },
  { key: "day", from: 12 },
  { key: "evening", from: 18 },
];
const pad = (n) => String(n).padStart(2, "0");

// Choose "from what time": an hour of the day, or any time (null).
// Hours before `minHour` (earlier today) can't be chosen. Tapping chooses and closes the sheet.
export function TimePickerSheet({ value, minHour = 0, onSelect, onClose }) {
  const { t } = useTranslation();

  return (
    <PickerSheet title={t("picker.time.title")} subtitle={t("picker.time.hint")} onClose={onClose}>
      {(close) => {
        const choose = (time) => close(() => onSelect(time));

        return (
          <>
            <button
              type="button"
              onClick={() => choose(null)}
              aria-pressed={value == null}
              className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.99] ${
                value == null ? "bg-sky-50 ring-sky-100" : "bg-slate-50 ring-slate-100"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  value == null ? "bg-sky-500 text-white" : "bg-white text-slate-500"
                }`}
              >
                <Clock className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{t("picker.time.any")}</span>
                <span className="block text-[11px] font-medium text-slate-400">{t("picker.time.anyHint")}</span>
              </span>
              {value == null && <Check className="h-5 w-5 shrink-0 text-sky-600" />}
            </button>

            <div className="mt-4 space-y-3">
              {PARTS.map((part) => (
                <div key={part.key}>
                  <p className="mb-1.5 text-[11px] font-semibold text-slate-400">{t(`picker.time.${part.key}`)}</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 6 }, (_, i) => {
                      const hour = part.from + i;
                      const time = `${pad(hour)}:00`;
                      const selected = time === value;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => choose(time)}
                          disabled={hour < minHour}
                          aria-pressed={selected}
                          className={`h-10 rounded-xl text-xs font-semibold tabular-nums transition active:scale-95 disabled:active:scale-100 ${
                            selected
                              ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                              : hour < minHour
                                ? "bg-transparent text-slate-300"
                                : "bg-slate-50 text-slate-800 ring-1 ring-slate-100"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </PickerSheet>
  );
}
