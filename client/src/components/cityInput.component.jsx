import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  searchLocations,
  exactLocation,
  localizedName,
  localizedRegion,
  displayName,
} from "../utils/locations";

export function CityInput({ label, value, onChange, placeholder, iconClass, required = false }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [open, setOpen] = useState(false);
  // null = not typing, so the input shows the saved city in the user's language
  const [query, setQuery] = useState(null);

  const text = query ?? localizedName(value ?? "", lang);
  const suggestions = useMemo(() => searchLocations(query ?? ""), [query]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setQuery(raw);
    setOpen(true);

    // "Ташкент" or "toshkent" typed in full → save the canonical "Toshkent" right away
    const exact = exactLocation(raw);
    onChange(exact ? exact.name : raw); // free text still allowed for places not in the list
  };

  const select = (l) => {
    onChange(l.name); // always save the canonical name
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <MapPin className={`h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
          <input
            type="text"
            value={text}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={() =>
              setTimeout(() => {
                setOpen(false);
                setQuery(null); // show the saved value in the user's language again
              }, 150) // let a suggestion click land first
            }
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-slate-100">
          {suggestions.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep focus so onBlur doesn't close too early
                onClick={() => select(l)}
                className="flex w-full flex-col items-start px-4 py-2 text-left active:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-900">{displayName(l, lang)}</span>
                <span className="text-[11px] text-slate-400">{localizedRegion(l, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}