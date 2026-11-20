import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Calendar as CalendarIcon,
  CarFront,
  Filter,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMe } from "../queries/me.query";
import { useLatestAds } from "../queries/latestAds.query";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll.hook";
import { formatDeparture } from "../utils/helpers";
import { useSearchAds } from "../queries/searchAds.query";
import { CityInput } from "../components/cityInput.component";
import { localizedName } from "../utils/locations";
import {
  FilterModal,
  DEFAULT_FILTER,
  filterToAdType,
} from "../components/filterModal.component";

// Only used for the latest-ads list, which is still filtered in the browser.
// Prefer the ad's own `type`; fall back to "has a car = driver" if it's missing.
const isDriverAd = (ad) =>
  ad.type ? ad.type === "DRIVER" : Boolean(ad.vehicle);

// Today's date in Tashkent as YYYY-MM-DD, whatever the device's time zone is
function tashkentToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

function RideCard({ ad, onClick }) {
  const { t, i18n } = useTranslation("search");
  const lang = i18n.language;
  const numberLocale = lang === "ru" ? "ru-RU" : "uz-UZ";

  const { day, date, time } = formatDeparture(ad.departureTime, lang);

  const driverName =
    [ad.user?.firstName, ad.user?.lastName].filter(Boolean).join(" ") || t("card.driver");

  const car = [ad.vehicle?.brand, ad.vehicle?.model].filter(Boolean).join(" ");
  const carLabel = car
    ? ad.vehicle.color
      ? `${car} (${ad.vehicle.color})`
      : car
    : t("card.passenger");

  const price =
    ad.price != null ? new Intl.NumberFormat(numberLocale).format(Number(ad.price)) : null;

  const arrival = ad.arrivalTime
    ? formatDeparture(ad.arrivalTime, lang).time
    : ad.durationMinutes
      ? formatDeparture(
          new Date(new Date(ad.departureTime).getTime() + ad.durationMinutes * 60_000),
          lang
        ).time
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group cursor-pointer rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-700">
            {driverName.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{driverName}</h3>
            <p className="text-xs text-slate-400">
              {day}, {date}
            </p>
          </div>
        </div>

        {price && (
          <div className="text-right">
            <p className="text-base font-extrabold text-sky-600">
              {price} <span className="text-xs font-medium">{t("card.currency")}</span>
            </p>
            <p className="text-[11px] text-slate-400">{t("card.perSeat")}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div>
          <p className="text-base font-bold text-slate-900">{time}</p>
          <p className="text-xs font-medium text-slate-400">{localizedName(ad.fromLocation, lang)}</p>
        </div>

        <div className="mt-1 flex items-center gap-1 px-2">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <div className="h-0.5 w-12 bg-slate-200" />
          <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        </div>

        <div>
          {arrival && <p className="text-base font-bold text-slate-900">{arrival}</p>}
          <p className="text-xs font-medium text-slate-400">{localizedName(ad.toLocation, lang)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CarFront className="h-4 w-4 text-slate-400" />
          <span className="max-w-[150px] truncate font-medium">{carLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <Users className="h-3.5 w-3.5" />
          <span>{t("freeSeats", { count: ad.seats })}</span>
        </div>
      </div>
    </div>
  );
}

function RideCardSkeleton() {
  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-9 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function SearchPage({ onNavigate }) {
  const { t } = useTranslation("search");
  const today = tashkentToday();

  const [from, setFrom] = useState("Zarafshon");
  const [to, setTo] = useState("Toshkent");
  const [selectedDate, setSelectedDate] = useState(today);
  const [passengers, setPassengers] = useState(1);

  const [searchParams, setSearchParams] = useState(null); // null = no search yet

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isFilterActive = !filter.drivers || !filter.passengers;
  const adType = filterToAdType(filter); // "DRIVER" | "PASSENGER" | undefined

  const { data: user } = useMe();
  const latest = useLatestAds(user.id);

  // `type` is added here, not in handleSearch, so pressing "Apply filter"
  // re-runs the current search right away. It's part of the query key,
  // so each filter gets its own cache entry.
  const search = useSearchAds(searchParams && { ...searchParams, type: adType });

  // show search results after a search, otherwise latest ads
  const isSearching = searchParams !== null;
  const {
    ads,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = isSearching ? search : latest;

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Search results are already filtered by the server.
  // Latest ads are filtered here until that endpoint gets a `type` param too.
  const visibleAds = isSearching
    ? (ads ?? [])
    : (ads ?? []).filter((ad) => (isDriverAd(ad) ? filter.drivers : filter.passengers));

  const handleApplyFilter = (next) => {
    setFilter(next);
    setIsFilterOpen(false);
  };

  const handleSearch = () => {
    // not named `t`: that would shadow the translation function
    const fromCity = from.trim();
    const toCity = to.trim();
    if (!fromCity || !toCity) return;
    setSearchParams({ from: fromCity, to: toCity, date: selectedDate, passengers });
  };

  const clearSearch = () => setSearchParams(null);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const incrementPassengers = () => setPassengers((p) => Math.min(p + 1, 8));
  const decrementPassengers = () => setPassengers((p) => Math.max(p - 1, 1));

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label={t("back")}
            onClick={() => onNavigate?.("home")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <button
            type="button"
            aria-label={t("filter")}
            aria-haspopup="dialog"
            aria-expanded={isFilterOpen}
            onClick={() => setIsFilterOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <Filter className="h-5 w-5 text-slate-700" />
            {/* Dot shows that a filter is on */}
            {isFilterActive && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
            )}
          </button>
        </header>

        {/* Form Card */}
        <section className="mt-5">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
            <div className="relative space-y-3">
              <CityInput
                label={t("form.from")}
                value={from}
                onChange={setFrom}
                placeholder={t("form.fromPlaceholder")}
                iconClass="text-sky-500"
                required
              />

              <button
                type="button"
                onClick={handleSwap}
                aria-label={t("form.swap")}
                className="absolute right-4 top-[30px] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 transition active:scale-90"
              >
                <ArrowUpDown className="h-4 w-4 text-sky-500" />
              </button>

              <CityInput
                label={t("form.to")}
                value={to}
                onChange={setTo}
                placeholder={t("form.toPlaceholder")}
                iconClass="text-rose-500"
                required
              />
            </div>

            {/* Date and passengers */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400">{t("form.date")}</p>
                  <input
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full cursor-pointer bg-transparent text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
                <div className="flex items-center gap-2 pl-1">
                  <Users className="h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">{t("form.passengers")}</p>
                    <p className="text-xs font-semibold text-slate-900">
                      {t("peopleCount", { count: passengers })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={decrementPassengers}
                    disabled={passengers <= 1}
                    aria-label={t("form.decrease")}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
                  >
                    <Minus className="h-3.5 w-3.5 text-slate-700" />
                  </button>

                  <span className="w-3 text-center text-xs font-bold text-slate-900">
                    {passengers}
                  </span>

                  <button
                    type="button"
                    onClick={incrementPassengers}
                    disabled={passengers >= 8}
                    aria-label={t("form.increase")}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
            >
              <Search className="h-4 w-4" />
              {t("form.submit")}
            </button>
          </div>
        </section>

        {/* Results */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {isSearching ? t("results.search") : t("results.latest")}
              {!isLoading && ` (${visibleAds.length})`}
            </h2>
            {isSearching && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-xs font-semibold text-sky-600"
              >
                {t("results.clear")}
              </button>
            )}
          </div>

          <div className={`mt-3 space-y-3 transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
            {isLoading && (
              <>
                <RideCardSkeleton />
                <RideCardSkeleton />
              </>
            )}

            {isError && (
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">{t("results.error")}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  {t("results.retry")}
                </button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {visibleAds.map((ad) => (
                  <RideCard key={ad.id} ad={ad} onClick={() => onNavigate("ad", ad.id)} />
                ))}

                {visibleAds.length === 0 && (
                  <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
                    {isSearching ? t("results.emptySearch") : t("results.empty")}
                  </p>
                )}

                <div ref={sentinelRef} className="h-1" />

                {isFetchingNextPage && (
                  <p className="py-3 text-center text-xs text-slate-400">
                    {t("results.loadingMore")}
                  </p>
                )}
                {!hasNextPage && visibleAds.length > 0 && (
                  <p className="py-3 text-center text-xs text-slate-400">{t("results.end")}</p>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Mounted only while open, so the draft is reset from `filter` each time */}
      {isFilterOpen && (
        <FilterModal
          value={filter}
          onApply={handleApplyFilter}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </main>
  );
}

export default SearchPage;