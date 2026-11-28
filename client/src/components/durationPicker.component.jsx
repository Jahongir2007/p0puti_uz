import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PickerSheet } from "./pickerSheet.component";
import { Wheel, WHEEL_ROW } from "./wheel.component";
import { fromHHMM, toHHMM } from "../utils/calendar";

const HOURS = Array.from({ length: 24 }, (_, h) => h); // under a day: the server puts the arrival on the same or the next day
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// While a wheel is being dragged down, Telegram must not take it as "swipe down to minimize the app"
function usePauseTelegramSwipes() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.isVerticalSwipesEnabled || !tg.disableVerticalSwipes) return;
    tg.disableVerticalSwipes();
    return () => tg.enableVerticalSwipes?.();
  }, []);
}

// How long the trip takes, on two wheels (hours, minutes). The app works out the arrival from it.
export function DurationPickerSheet({ value, departure, onSelect, onClose }) {
  const { t } = useTranslation("createAd");
  const [hours, setHours] = useState(Math.min(Math.floor(value / 60), 23));
  const [minutes, setMinutes] = useState(Math.floor((value % 60) / 5) * 5);
  usePauseTelegramSwipes();

  const total = hours * 60 + minutes;
  const arrival = fromHHMM(departure) + total;

  return (
    <PickerSheet title={t("duration.title")} subtitle={t("duration.hint")} onClose={onClose}>
      {(close) => (
        <>
          <div className="rounded-2xl bg-emerald-50/70 py-3 text-center ring-1 ring-emerald-100/80" aria-live="polite">
            {total === 0 ? (
              <p className="py-2 text-sm font-medium text-rose-500">{t("duration.empty")}</p>
            ) : (
              <>
                <p className="text-[11px] font-medium text-emerald-700">{t("arrival.label")}</p>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-900">
                  {toHHMM(arrival)}
                  {arrival >= 1440 && (
                    <span className="ml-1.5 align-middle text-xs font-medium text-emerald-600">{t("arrival.nextDay")}</span>
                  )}
                </p>
              </>
            )}
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {/* The band across both wheels that marks the chosen row */}
            <div
              className="pointer-events-none absolute inset-x-0 rounded-xl bg-slate-100"
              style={{ top: WHEEL_ROW * 2, height: WHEEL_ROW }}
              aria-hidden="true"
            />
            <div className="relative flex items-center">
              <div className="flex-1">
                <Wheel values={HOURS} value={hours} onChange={setHours} label={t("duration.hoursLabel")} />
              </div>
              <span className="w-12 text-sm font-semibold text-slate-500">{t("duration.unitHours")}</span>
            </div>
            <div className="relative flex items-center">
              <div className="flex-1">
                <Wheel
                  values={MINUTES}
                  value={minutes}
                  onChange={setMinutes}
                  label={t("duration.minutesLabel")}
                  format={(m) => String(m).padStart(2, "0")}
                />
              </div>
              <span className="w-12 text-sm font-semibold text-slate-500">{t("duration.unitMinutes")}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => close(() => onSelect(total))}
            disabled={total === 0}
            className="mt-5 h-12 w-full rounded-2xl bg-sky-500 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {t("common:picker.exact.done")}
          </button>
        </>
      )}
    </PickerSheet>
  );
}
