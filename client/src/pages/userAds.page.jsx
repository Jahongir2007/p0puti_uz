import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserAds, useDeleteUserAd, useUpdateUserAd } from "../queries/userAds.query";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll.hook";
import { formatDeparture } from "../utils/helpers";
import { localizedName } from "../utils/locations";
import { showAlert, showConfirm } from "../utils/telegram";

const tg = window.Telegram?.WebApp;

function UserAdCard({ ad, onOpen }) {
  const { t, i18n } = useTranslation("userAds");
  const lang = i18n.language;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    price: ad.price ?? "",
    seats: ad.seats ?? 1,
    description: ad.description ?? "",
  });

  // One mutation per card, so each card has its own pending state
  const deleteAd = useDeleteUserAd();
  const updateAd = useUpdateUserAd();

  const { day, date, time } = formatDeparture(ad.departureTime, lang);
  const numberLocale = lang === "ru" ? "ru-RU" : "uz-UZ";
  const price =
    ad.price != null
      ? t("price", { value: new Intl.NumberFormat(numberLocale).format(Number(ad.price)) })
      : t("negotiable");

  const handleDelete = async () => {
    if (!(await showConfirm(t("deleteConfirm")))) return;
    deleteAd.mutate(ad.id, {
      onError: (error) => {
        if(error.sessionExpired) return;
        showAlert(t("deleteFailed"))
      },
    });
  };

  const startEditing = () => {
    // start from the current values every time the form opens
    setForm({ price: ad.price ?? "", seats: ad.seats ?? 1, description: ad.description ?? "" });
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateAd.mutate(
      {
        adId: ad.id,
        payload: {
          price: Number(form.price),
          seats: form.seats,
          description: form.description.trim(),
        },
      },
      {
        onSuccess: () => setIsEditing(false),
        onError: (error) => {
          if(error.sessionExpired) return;
          showAlert(t("updateFailed"))
        },
      }
    );
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      {/* Tapping the top part opens the ad */}
      <button
        type="button"
        onClick={() => onOpen(ad.id)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {localizedName(ad.fromLocation, lang)} → {localizedName(ad.toLocation, lang)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {day}, {date} • {time}
          </p>
        </div>
        {(ad.type === "DRIVER" || ad.type === "PASSENGER") && (
          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
            {t(`type.${ad.type}`)}
          </span>
        )}
      </button>

      {isEditing ? (
        <form onSubmit={handleSave} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[11px] font-medium text-slate-400">{t("form.price")}</p>
            <input
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div>
              <p className="text-[11px] font-medium text-slate-400">{t("form.seats")}</p>
              <p className="text-sm font-semibold text-slate-900">
                {t("seats", { count: form.seats })}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t("form.decrease")}
                disabled={form.seats <= 1}
                onClick={() => setForm({ ...form, seats: form.seats - 1 })}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5 text-slate-700" />
              </button>
              <span className="w-4 text-center text-xs font-bold">{form.seats}</span>
              <button
                type="button"
                aria-label={t("form.increase")}
                disabled={form.seats >= 8}
                onClick={() => setForm({ ...form, seats: form.seats + 1 })}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 text-slate-700" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[11px] font-medium text-slate-400">{t("form.description")}</p>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full resize-none bg-transparent text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              disabled={updateAd.isPending}
              className="h-11 flex-1 rounded-2xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50"
            >
              {updateAd.isPending ? t("form.saving") : t("form.save")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-2.5">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {t("seats", { count: ad.seats })}
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              {price}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t("edit")}
              onClick={startEditing}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t("delete")}
              disabled={deleteAd.isPending}
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserAdCardSkeleton() {
  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function UserAdsPage({ onNavigate }) {
  const { t } = useTranslation("userAds");
  const goBack = useCallback(() => onNavigate("profile"), [onNavigate]);

  const {
    ads,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUserAds();

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  useEffect(() => {
    if (!tg?.BackButton) return;
    tg.BackButton.show();
    tg.BackButton.onClick(goBack);
    return () => {
      tg.BackButton.offClick(goBack);
      tg.BackButton.hide();
    };
  }, [goBack]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("back")}
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
        </header>

        <div className="mt-5 space-y-3">
          {isLoading && (
            <>
              <UserAdCardSkeleton />
              <UserAdCardSkeleton />
            </>
          )}

          {isError && (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">{t("error")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {!isLoading && !isError && ads.length === 0 && (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-400">{t("empty")}</p>
              <button
                type="button"
                onClick={() => onNavigate("create")}
                className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
              >
                {t("emptyAction")}
              </button>
            </div>
          )}

          {!isLoading &&
            !isError &&
            ads.map((ad) => (
              <UserAdCard key={ad.id} ad={ad} onOpen={(id) => onNavigate("ad", id)} />
            ))}

          <div ref={sentinelRef} className="h-1" />

          {isFetchingNextPage && (
            <p className="py-3 text-center text-xs text-slate-400">{t("loadingMore")}</p>
          )}
          {!isLoading && !hasNextPage && ads.length > 0 && (
            <p className="py-3 text-center text-xs text-slate-400">{t("end")}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default UserAdsPage;