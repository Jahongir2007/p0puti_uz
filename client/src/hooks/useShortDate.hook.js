import { useTranslation } from "react-i18next";
import { addDays, mondayIndex, tashkentToday, ymdToIso } from "../utils/calendar";
import { formatDeparture } from "../utils/helpers";

// "Bugun, 28-noy", "Ertaga, 29-noy", then "Ch, 2-dek": short enough for a half-width tile
export function useShortDate() {
  const { t, i18n } = useTranslation();
  return (ymd) => {
    const { day, date } = formatDeparture(ymdToIso(ymd), i18n.language);
    const today = tashkentToday();
    const near = ymd === today || ymd === addDays(today, 1);
    const weekday = t("picker.weekdaysShort", { returnObjects: true })[mondayIndex(ymd)];
    return `${near ? day : weekday}, ${date}`;
  };
}
