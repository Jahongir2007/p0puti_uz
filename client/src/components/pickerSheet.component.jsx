import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A bottom sheet for choosing something (a date, a time), in the same style as the result popups.
// `children(close)`: close(then) slides the sheet down, then runs `then` (onClose by default).
// A backdrop tap, Escape and the X button close it without choosing.
export function PickerSheet({ title, subtitle, onClose, children }) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef(null);
  // Set while the sheet slides down: what to run once it's down
  const [afterClose, setAfterClose] = useState(null);
  const closing = afterClose !== null;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind doesn't scroll
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const close = (then = onClose) => {
    if (closing) return;
    if (prefersReducedMotion()) {
      then?.();
      return;
    }
    setAfterClose(() => then ?? (() => {}));
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className={`absolute inset-0 bg-slate-900/40 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={() => close()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) afterClose();
        }}
        className={`relative w-full max-w-md rounded-t-[28px] bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl outline-none motion-reduce:animate-none sm:rounded-[28px] sm:pb-5 ${
          closing ? "animate-sheet-down" : "animate-sheet-up"
        }`}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => close()}
            aria-label={t("picker.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children(close)}</div>
      </div>
    </div>
  );
}
