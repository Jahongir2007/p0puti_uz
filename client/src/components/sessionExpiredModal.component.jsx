import { useEffect, useId, useRef } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "../stores/session.store";

const tg = window.Telegram?.WebApp;

// Shown once the session can't be renewed. Not dismissible: every request
// would fail anyway, so the only way forward is reopening the mini app,
// which gives Telegram fresh login data.
export function SessionExpiredModal() {
  const expired = useSessionStore((s) => s.expired);
  if (!expired) return null;
  return <SessionExpiredSheet />;
}

function SessionExpiredSheet() {
  const { t } = useTranslation("common");
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    // Lock page scroll while the popup is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel, not the button: screen readers announce the popup,
    // and phones don't draw a focus ring on the button
    panelRef.current?.focus();

    if (tg?.isVersionAtLeast?.("6.1")) {
      tg.HapticFeedback?.notificationOccurred("error");
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleClose = () => {
    if (tg?.close) tg.close();
    else window.location.reload(); // opened in a normal browser
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40" aria-hidden="true" />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-md animate-sheet-up rounded-t-3xl bg-white px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center shadow-xl outline-none motion-reduce:animate-none sm:rounded-3xl sm:pb-5"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <Clock className="h-7 w-7 text-amber-600" strokeWidth={2.2} />
        </div>

        <h2 id={titleId} className="mt-4 text-lg font-bold tracking-tight text-slate-900">
          {t("sessionExpired.title")}
        </h2>
        <p id={messageId} className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          {t("sessionExpired.message")}
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="mt-6 h-12 w-full rounded-2xl bg-sky-500 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          {t("sessionExpired.close")}
        </button>
      </div>
    </div>
  );
}
