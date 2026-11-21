import {
  ArrowRight,
  Bell,
  CarFront,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMe } from "../queries/me.query";
import { useLatestAds } from "../queries/latestAds.query";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll.hook";
import { formatDeparture } from "../utils/helpers";
import { localizedName } from "../utils/locations";

function RoutePoint({ label, value, last = false }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-5 flex-col items-center">
        <MapPin className="h-5 w-5 text-sky-500" strokeWidth={2.2} />
        {!last && <div className="mt-1 h-8 w-px border-l border-dashed border-slate-300" />}
      </div>

      <div className={last ? "pb-1" : "pb-2"}>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-[15px] font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function AdCard({ ad, onClick }) {
  const { t, i18n } = useTranslation("home");
  const { day, date, time } = formatDeparture(ad.departureTime);
  const lang = i18n.language;

  return (
    <button
      type="button"
      onClick={() => onClick?.(ad)}
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
            {t("latest.seats", { count: ad.seats })}
          </p>
        </div>
      </div>

      <ChevronRight className="ml-2 h-5 w-5 shrink-0 text-slate-300" />
    </button>
  );
}

function AdCardSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function LatestAdsList({ onNavigate }) {
  const { t } = useTranslation("home");
  const { data: user } = useMe();

  const {
    ads,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useLatestAds(user.id);

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <AdCardSkeleton />
        <AdCardSkeleton />
        <AdCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-500">{t("latest.error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          {t("latest.retry")}
        </button>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
        {t("latest.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} onClick={() => onNavigate("ad", ad.id)} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <p className="py-3 text-center text-xs text-slate-400">{t("latest.loadingMore")}</p>
      )}
      {!hasNextPage && (
        <p className="py-3 text-center text-xs text-slate-400">{t("latest.end")}</p>
      )}
    </div>
  );
}

function HomePage({ onNavigate }) {
  const { t } = useTranslation("home");

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{t("greeting")}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{t("title")}</h1>
          </div>

          <button
            type="button"
            aria-label={t("notifications")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100"
          >
            <Bell className="h-5 w-5 text-slate-700" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
          </button>
        </header>

        {/* Hero */}
        <section className="mt-6 overflow-hidden rounded-3xl bg-sky-500 p-5 shadow-sm">
          <div className="max-w-[280px]">
            <p className="text-sm font-medium text-sky-100">P0Puti.uz</p>
            <h2 className="mt-1 text-2xl font-bold leading-tight text-white">
              {t("hero.line1")}
              <br />
              {t("hero.line2")}
            </h2>
            <p className="mt-2 text-sm leading-5 text-sky-50">{t("hero.text")}</p>
          </div>
        </section>

        {/* Search */}
        <section className="-mt-2 px-1">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
            <div className="space-y-1">
              <RoutePoint label={t("search.from")} value="Zarafshon" />
              <RoutePoint label={t("search.to")} value="Toshkent" last />
            </div>

            <button
              type="button"
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white transition active:scale-[0.98]"
              onClick={() => onNavigate("search")}
            >
              <Search className="h-4 w-4" />
              {t("search.button")}
            </button>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{t("quick.title")}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="group rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
              onClick={() => onNavigate("search")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                <CarFront className="h-5 w-5 text-sky-500" />
              </div>
              <p className="mt-3 text-sm font-bold">{t("quick.findTitle")}</p>
              <p className="mt-1 text-xs leading-4 text-slate-400">{t("quick.findText")}</p>
            </button>

            <button
              type="button"
              className="group rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
              onClick={() => onNavigate("create")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-sm font-bold">{t("quick.createTitle")}</p>
              <p className="mt-1 text-xs leading-4 text-slate-400">{t("quick.createText")}</p>
            </button>
          </div>
        </section>

        {/* Latest ads */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{t("latest.title")}</h2>
            <button
              type="button"
              className="flex items-center gap-0.5 text-xs font-semibold text-sky-500"
              onClick={() => onNavigate("search")}
            >
              {t("latest.all")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <LatestAdsList onNavigate={onNavigate} />
        </section>

        {/* Community banner */}
        <section className="mt-7 rounded-2xl bg-slate-900 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Users className="h-5 w-5 text-white" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-white">{t("community.title")}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-300">{t("community.text")}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HomePage;