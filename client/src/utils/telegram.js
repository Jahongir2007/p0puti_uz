const tg = window.Telegram?.WebApp;
const hasNativeDialogs = !!tg?.isVersionAtLeast?.("6.2");

export function showAlert(message) {
  if (hasNativeDialogs) tg.showAlert(message);
  else window.alert(message);
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    if (hasNativeDialogs) tg.showConfirm(message, resolve);
    else resolve(window.confirm(message));
  });
}