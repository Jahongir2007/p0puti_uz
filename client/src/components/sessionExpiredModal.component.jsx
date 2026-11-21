import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "../stores/session.store";
import { BottomSheet } from "./bottomSheet.component";

const tg = window.Telegram?.WebApp;

// Shown once the session can't be renewed. Not dismissible: every request
// would fail anyway, so the only way forward is reopening the mini app,
// which gives Telegram fresh login data.
export function SessionExpiredModal() {
  const { t } = useTranslation("common");
  const expired = useSessionStore((s) => s.expired);
  if (!expired) return null;

  const closeApp = () => {
    if (tg?.close) tg.close();
    else window.location.reload(); // opened in a normal browser
  };

  return (
    <BottomSheet
      tone="warning"
      icon={Clock}
      title={t("sessionExpired.title")}
      message={t("sessionExpired.message")}
      actionLabel={t("sessionExpired.close")}
      onAction={closeApp}
      dismissible={false}
    />
  );
}
