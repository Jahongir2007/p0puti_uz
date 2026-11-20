import { useCallback, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  Phone,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAd } from "../queries/getAdById.query";
import { formatDeparture } from "../utils/helpers";
import { localizedName } from "../utils/locations";

const tg = window.Telegram?.WebApp;

/* ---------- helpers ---------- */

// Returns a price formatter for the current language
function usePriceFormatter() {
  const { t, i18n } = useTranslation("ad");
  const locale = i18n.language === "ru" ? "ru-RU" : "uz-UZ";

  return (price) => {
    if (price == null) return null;
    return t("price", { value: new Intl.NumberFormat(locale).format(price) });
  };
}

// Shows Telegram's native back button while this page is open
function useTelegramBackButton(onBack) {
  useEffect(() => {
    if (!tg?.BackButton) return;
    tg.BackButton.show();
    tg.BackButton.onClick(onBack);
    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, [onBack]);
}

/* ---------- small components ---------- */

function RoutePoint({ label, value, hint, last = false }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-5 flex-col items-center">
        <MapPin className="h-5 w-5 text-sky-500" strokeWidth={2.2} />
        {!last && <div className="mt-1 h-8 w-px border-l border-dashed border-slate-300" />}
      </div>

      <div className={`flex flex-1 items-start justify-between ${last ? "pb-1" : "pb-2"}`}>
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-0.5 text-[15px] font-semibold text-slate-900">{value}</p>
        </div>
        {hint && <p className="mt-4 text-xs font-semibold text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-500",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-500",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function RelatedAdCard({ ad, onClick }) {
  const { t, i18n } = useTranslation("ad");
  const formatPrice = usePriceFormatter();
  const { day, date, time } = formatDeparture(ad.departureTime, i18n.language);
  const price = formatPrice(ad.price);
  const lang = i18n.language;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {localizedName(ad.fromLocation, lang)} → {localizedName(ad.toLocation, lang)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {day}, {date} • {time}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {t("seats", { count: ad.seats })}
            {price ? ` • ${price}` : ""}
          </p>
        </div>
      </div>

      <ChevronRight className="ml-2 h-5 w-5 shrink-0 text-slate-300" />
    </button>
  );
}

function AdPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
      <div className="h-32 animate-pulse rounded-3xl bg-white ring-1 ring-slate-100" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
        ))}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

function AdPage({ adId, onNavigate }) {
  const { t } = useTranslation("ad");
  const { data, isPending, isError, refetch } = useAd(adId);

  // useCallback so the Telegram back button isn't re-registered on every render
  const goBack = useCallback(() => onNavigate("home"), [onNavigate]);
  useTelegramBackButton(goBack);

  // When jumping from one ad to a related ad, start at the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [adId]);

  const ad = data?.ad;
  const related = data?.related ?? [];

  // Filled in once the backend includes the ad's user
  const username = ad?.user?.username;
  const phone = ad?.user?.phone ?? ad?.phone;

  const openChat = () => {
    if (!username) return;
    const url = `https://t.me/${username}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-32 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        {/* Header */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("header.back")}
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div>
            <p className="text-sm font-medium text-slate-500">{t("header.label")}</p>
            <h1 className="text-xl font-bold tracking-tight">{t("header.title")}</h1>
          </div>
        </header>

        <div className="mt-6">
          {!adId && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
              {t("state.notSelected")}
            </p>
          )}

          {adId && isPending && <AdPageSkeleton />}

          {adId && isError && (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">{t("state.error")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                {t("state.retry")}
              </button>
            </div>
          )}

          {adId && !isPending && !isError && !ad && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
              {t("state.notFound")}
            </p>
          )}

          {ad && <AdDetails ad={ad} related={related} onNavigate={onNavigate} />}
        </div>
      </div>

      {/* Sticky contact bar */}
      {ad && (username || phone) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {phone && (
              <a
                href={`tel:${phone}`}
                aria-label={t("contact.call")}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700 transition active:scale-95 ${
                  username ? "w-12 shrink-0" : "flex-1"
                }`}
              >
                <Phone className="h-5 w-5" />
                {!username && t("contact.call")}
              </a>
            )}
            {username && (
              <button
                type="button"
                onClick={openChat}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" />
                {t("contact.telegram")}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function AdDetails({ ad, related, onNavigate }) {
  const { t, i18n } = useTranslation("ad");
  const formatPrice = usePriceFormatter();
  const lang = i18n.language;

  const departure = formatDeparture(ad.departureTime, i18n.language);
  const arrival = ad.arrivalTime ? formatDeparture(ad.arrivalTime, i18n.language) : null;
  const price = formatPrice(ad.price);
  const isDriver = ad.type === "DRIVER";
  const hasType = ad.type === "DRIVER" || ad.type === "PASSENGER";

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-sky-500 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-sky-100">
            {departure.day}, {departure.date}
          </p>
          {hasType && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              {t(`type.${ad.type}`)}
            </span>
          )}
        </div>
        <h2 className="mt-1 text-2xl font-bold leading-tight text-white">
          {localizedName(ad.fromLocation, lang)}
          <span className="mx-2 text-sky-200">→</span>
          {localizedName(ad.toLocation, lang)}
        </h2>
        {price && (
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
            {price}
          </p>
        )}
      </section>

      {/* Route */}
      <section className="-mt-2 px-1">
        <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
          <RoutePoint label={t("route.from")} value={localizedName(ad.fromLocation, lang)} hint={departure.time} />
          <RoutePoint label={t("route.to")} value={localizedName(ad.toLocation, lang)} hint={arrival?.time} last />
        </div>
      </section>

      {/* Info grid */}
      <section className="mt-7">
        <h2 className="mb-3 text-base font-bold">{t("info.title")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <InfoTile
            icon={CalendarDays}
            label={t("info.date")}
            value={`${departure.day}, ${departure.date}`}
          />
          <InfoTile icon={Clock} label={t("info.departure")} value={departure.time} tone="violet" />
          <InfoTile
            icon={Users}
            label={isDriver ? t("info.freeSeats") : t("info.neededSeats")}
            value={t("seats", { count: ad.seats })}
            tone="emerald"
          />
          <InfoTile
            icon={Wallet}
            label={t("info.price")}
            value={price ?? t("info.negotiable")}
            tone="amber"
          />
          <InfoTile
            icon={Briefcase}
            label={t("info.luggage")}
            value={ad.luggageAllowed ? t("info.luggageYes") : t("info.luggageNo")}
            tone={ad.luggageAllowed ? "sky" : "rose"}
          />
          <InfoTile
            icon={Flag}
            label={t("info.arrival")}
            value={arrival ? arrival.time : t("info.notSpecified")}
            tone="slate"
          />
        </div>
      </section>

      {/* Person (needs `user` included by the backend) */}
      {ad.user && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">
            {isDriver ? t("person.driver") : t("person.passenger")}
          </h2>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            {ad.user.photoUrl ? (
              <img
                src={ad.user.photoUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <User className="h-5 w-5 text-slate-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {[ad.user.firstName, ad.user.lastName].filter(Boolean).join(" ") ||
                  t("person.fallbackName")}
              </p>
              {ad.user.username && (
                <p className="mt-0.5 truncate text-xs text-slate-400">@{ad.user.username}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Description */}
      {ad.description?.trim() && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">{t("description")}</h2>
          <p className="whitespace-pre-line rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-100">
            {ad.description}
          </p>
        </section>
      )}

      {/* Related ads */}
      {related.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">{t("related")}</h2>
          <div className="space-y-3">
            {related.map((r) => (
              <RelatedAdCard key={r.id} ad={r} onClick={() => onNavigate("ad", String(r.id))} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default AdPage;