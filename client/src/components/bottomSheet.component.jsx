import { useEffect, useId, useRef, useState } from "react";

const tg = window.Telegram?.WebApp;

// Icon colours and the phone vibration for each kind of message
const TONES = {
  success: { badge: "bg-emerald-100 ring-emerald-50", icon: "text-emerald-600", haptic: "success" },
  warning: { badge: "bg-amber-100 ring-amber-50", icon: "text-amber-600", haptic: "warning" },
  error: { badge: "bg-rose-100 ring-rose-50", icon: "text-rose-600", haptic: "error" },
};

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A result popup that slides up from the bottom: icon, title, message and one button.
// Dismissible sheets also close on a backdrop tap or Escape, sliding back down first.
export function BottomSheet({
  tone = "success",
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  dismissible = true,
}) {
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef(null);
  const afterClose = useRef(null);
  const [closing, setClosing] = useState(false);
  const style = TONES[tone] ?? TONES.success;

  useEffect(() => {
    // Lock page scroll while the sheet is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel, not the button: screen readers announce the sheet,
    // and phones don't draw a focus ring on the button
    panelRef.current?.focus();

    if (tg?.isVersionAtLeast?.("6.1")) {
      tg.HapticFeedback?.notificationOccurred(style.haptic);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [style.haptic]);

  // Slide down, then run `then` (onClose by default)
  const close = (then = onClose) => {
    if (closing) return;
    if (prefersReducedMotion()) {
      then?.();
      return;
    }
    afterClose.current = then;
    setClosing(true);
  };

  useEffect(() => {
    if (!dismissible) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const handleAction = () => {
    if (dismissible) close(onAction ?? onClose);
    else onAction?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className={`absolute inset-0 bg-slate-900/40 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={dismissible ? () => close() : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) afterClose.current?.();
        }}
        className={`relative w-full max-w-md rounded-t-[28px] bg-white px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl outline-none motion-reduce:animate-none sm:rounded-[28px] sm:pb-6 ${
          closing ? "animate-sheet-down" : "animate-sheet-up"
        }`}
      >
        <div
          className={`mx-auto flex h-16 w-16 animate-pop-in items-center justify-center rounded-full ring-8 motion-reduce:animate-none ${style.badge}`}
        >
          <Icon className={`h-8 w-8 ${style.icon}`} strokeWidth={2.2} />
        </div>

        <h2 id={titleId} className="mt-6 text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p id={messageId} className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-slate-500">
          {message}
        </p>

        <button
          type="button"
          onClick={handleAction}
          className="mt-7 h-12 w-full rounded-2xl bg-sky-500 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/25 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
