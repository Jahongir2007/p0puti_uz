import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PickerSheet } from "./pickerSheet.component";
import { fromHHMM, toHHMM } from "../utils/calendar";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n) => String(n).padStart(2, "0");

// Choose an exact time: an hour, then minutes in 5-minute steps, then "Done".
// `min` ("HH:MM"): earlier times can't be chosen (e.g. the past, today).
// `info(time)`: a live line under the clock (e.g. the trip length).
// `problem(time)`: a reason the time can't be used, shown instead of `info`; "Done" is then off.
export function ExactTimePickerSheet({ title, subtitle, value, min, info, problem, onSelect, onClose }) {
  const { t } = useTranslation();
  const minMins = min ? fromHHMM(min) : 0;
  const [draft, setDraft] = useState(() => Math.max(fromHHMM(value), minMins));

  const hour = Math.floor(draft / 60);
  const minute = draft % 60;
  const time = toHHMM(draft);
  const issue = draft < minMins ? null : problem?.(time);

  // A new hour keeps the minutes, unless that's too early: then its first allowed minute
  const pickHour = (h) => setDraft(Math.max(h * 60 + minute, minMins));

  return (
    <PickerSheet title={title} subtitle={subtitle} onClose={onClose}>
      {(close) => (
        <>
          <div className="rounded-2xl bg-slate-50 py-3 text-center ring-1 ring-slate-100">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900" aria-live="polite">
              {time}
            </p>
            {(issue || info) && (
              <p className={`mt-1 text-xs font-medium ${issue ? "text-rose-500" : "text-slate-500"}`}>
                {issue || info(time)}
              </p>
            )}
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold text-slate-400">{t("picker.exact.hour")}</p>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label={t("picker.exact.hour")}>
            {HOURS.map((h) => {
              const tooEarly = h * 60 + 55 < minMins; // not one minute of this hour is allowed
              const selected = h === hour;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => pickHour(h)}
                  disabled={tooEarly}
                  aria-pressed={selected}
                  aria-label={t("picker.exact.hourLabel", { hour: pad(h) })}
                  className={`h-10 rounded-xl text-sm font-semibold tabular-nums transition active:scale-95 disabled:active:scale-100 ${
                    selected
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                      : tooEarly
                        ? "bg-transparent text-slate-300"
                        : "bg-slate-50 text-slate-800 ring-1 ring-slate-100"
                  }`}
                >
                  {pad(h)}
                </button>
              );
            })}
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold text-slate-400">{t("picker.exact.minute")}</p>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label={t("picker.exact.minute")}>
            {MINUTES.map((m) => {
              const tooEarly = hour * 60 + m < minMins;
              const selected = m === minute;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDraft(hour * 60 + m)}
                  disabled={tooEarly}
                  aria-pressed={selected}
                  aria-label={t("picker.exact.minuteLabel", { minute: pad(m) })}
                  className={`h-10 rounded-xl text-sm font-semibold tabular-nums transition active:scale-95 disabled:active:scale-100 ${
                    selected
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                      : tooEarly
                        ? "bg-transparent text-slate-300"
                        : "bg-slate-50 text-slate-800 ring-1 ring-slate-100"
                  }`}
                >
                  :{pad(m)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => close(() => onSelect(time))}
            disabled={Boolean(issue) || draft < minMins}
            className="mt-5 h-12 w-full rounded-2xl bg-sky-500 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {t("picker.exact.done")}
          </button>
        </>
      )}
    </PickerSheet>
  );
}
