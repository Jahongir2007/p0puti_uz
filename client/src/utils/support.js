// Support account from VITE_SUPPORT_USERNAME (without @). Empty → every support button is hidden,
// so nobody is sent to an account we don't own.
export const supportUsername = import.meta.env.VITE_SUPPORT_USERNAME?.replace(/^@/, "").trim() || null;

export function openSupport() {
  if (!supportUsername) return;
  const url = `https://t.me/${supportUsername}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, "_blank");
}
