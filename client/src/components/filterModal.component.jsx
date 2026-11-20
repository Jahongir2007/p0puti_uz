import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

// Both checked = show everything
export const DEFAULT_FILTER = { drivers: true, passengers: true };

// Filter state → value for the `type` query param.
// Both selected → undefined, so axios leaves the param out and the server returns all types.
export function filterToAdType({ drivers, passengers }) {
  if (drivers && !passengers) return "DRIVER";
  if (passengers && !drivers) return "PASSENGER";
  return undefined;
}

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100 transition active:scale-[0.99]">
      <span className="text-sm font-semibold text-slate-900">{label}</span>

      {/* Real checkbox stays in the DOM for keyboard and screen readers, just visually hidden */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white ring-1 ring-slate-300 transition peer-checked:bg-sky-500 peer-checked:ring-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500"
      >
        <Check className="h-4 w-4 text-white" />
      </span>
    </label>
  );
}

export function FilterModal({ value, onApply, onClose }) {
  const { t } = useTranslation("search");
  const titleId = useId();

  // Edits stay local until "Apply" is pressed; closing the popup discards them
  const [draft, setDraft] = useState(value);

  // Lock page scroll while the popup is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const nothingSelected = !draft.drivers && !draft.passengers;

  const toggle = (key) => (checked) => setDraft((d) => ({ ...d, [key]: checked }));

  const handleApply = () => {
    if (nothingSelected) return;
    onApply(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop: tap outside to close */}
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:rounded-3xl sm:pb-5"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            {t("filterModal.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("filterModal.close")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition active:scale-90"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-slate-400">{t("filterModal.adType")}</p>
        <div className="mt-2 space-y-2">
          <FilterCheckbox
            label={t("filterModal.drivers")}
            checked={draft.drivers}
            onChange={toggle("drivers")}
          />
          <FilterCheckbox
            label={t("filterModal.passengers")}
            checked={draft.passengers}
            onChange={toggle("passengers")}
          />
        </div>

        {nothingSelected && (
          <p className="mt-2 text-xs font-medium text-rose-500">{t("filterModal.selectOne")}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_FILTER)}
            className="h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
          >
            {t("filterModal.reset")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={nothingSelected}
            className="h-12 flex-[2] rounded-2xl bg-sky-500 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          >
            {t("filterModal.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}