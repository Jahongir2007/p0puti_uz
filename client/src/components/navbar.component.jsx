import { CarFront, Plus, Search, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

// Outside the component: it never changes, so it isn't rebuilt on every render
const SECTIONS = [
  { id: "home", icon: CarFront },
  { id: "search", icon: Search },
  { id: "create", icon: Plus },
  { id: "profile", icon: UserRound },
];

function Navbar({ activeSection, onSectionChange }) {
  const { t } = useTranslation("common");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {SECTIONS.map(({ id, icon: Icon }) => {
          const isActive = activeSection === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-1 ${
                isActive ? "text-sky-500" : "text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {t(`nav.${id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navbar;