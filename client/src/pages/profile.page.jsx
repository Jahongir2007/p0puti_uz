import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  CarFront,
  ChevronRight,
  Globe,
  HelpCircle,
  ShieldCheck,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  ClipboardList
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authenticateTelegram } from "../api/auth.api";
import ProfilePageSkeleton from "./skeletons/profile.skeleton.page";
import ProfileError from "../components/profileError.component";
import {
  getTelegramUserVehicles,
  createTelegramUserVehicle,
  updateTelegramUserVehicle,
  deleteTelegramUserVehicle,
} from "../api/vehicle.api";
import { saveLanguage } from "../i18n";
import { showAlert, showConfirm } from "../utils/telegram";

const tg = window.Telegram?.WebApp;
// const hasNativeDialogs = !!tg?.isVersionAtLeast?.("6.2");

// Telegram's own dialogs look native and work on Telegram Web, where confirm() can be blocked
// function showAlert(message) {
//   if (hasNativeDialogs) tg.showAlert(message);
//   else window.alert(message);
// }

// function showConfirm(message) {
//   return new Promise((resolve) => {
//     if (hasNativeDialogs) tg.showConfirm(message, resolve);
//     else resolve(window.confirm(message));
//   });
// }

// "01 a 777 aa " → "01 A 777 AA"
const normalizePlate = (s) => s.trim().toUpperCase().replace(/\s+/g, " ");

const EMPTY_CAR = { brand: "", model: "", color: "", plateNumber: "" };

const LANGUAGES = [
  { code: "uz", label: "O'zbekcha", native: "Lotin" },
  { code: "ru", label: "Русский", native: "Russian" },
];

// Popular car brands and models in Uzbekistan
const CAR_BRANDS = {
  Chevrolet: [
    "Cobalt", "Gentra (Lacetti)", "Damas", "Labo", "Onix", "Tracker", "Malibu 2",
    "Captiva 5", "Tahoe", "Traverse", "Monza", "Spark", "Nexia 3", "Captiva", "Malibu",
  ],
  BYD: ["Song Plus EV / DM-i", "Chazor", "Han", "Tang", "Yuan Plus (Atto 3)", "Seagull", "Dolphin", "Seal"],
  Kia: ["K5", "Seltos", "Sportage", "Sorento", "Carnival", "Cerato", "Sonet", "EV6"],
  Chery: ["Tiggo 7 Pro", "Tiggo 8 Pro / Max", "Tiggo 4 Pro", "Arrizo 6 Pro", "Explore 06"],
  Haval: ["Jolion", "H6", "M6", "Dargo", "H9"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe", "Sonata", "Creta", "Accent / Solaris", "Palisade"],
  Toyota: ["Camry", "Corolla", "Land Cruiser 300", "Prado", "RAV4", "Highlander"],
  Lada: ["Vesta", "Granta", "Niva Legend", "Niva Travel", "Largus"],
  Jetour: ["Dashing", "X70 Plus", "X90 Plus", "T2"],
  Geely: ["Coolray", "Monjaro", "Tugella", "Geometry E"],
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-sky-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function LanguagePicker({ current, onSelect, onBack }) {
  const { t } = useTranslation("profile");

  return (
    <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-100 p-2 pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("back")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-slate-900">{t("settings.language")}</span>
      </div>

      <div className="mt-1 space-y-1">
        {LANGUAGES.map((lang) => {
          const active = lang.code === current;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code)}
              className={`flex w-full items-center justify-between rounded-2xl p-3 transition active:scale-[0.99] ${
                active ? "bg-sky-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="text-left">
                <p className={`text-xs font-bold ${active ? "text-sky-700" : "text-slate-900"}`}>
                  {lang.label}
                </p>
                <p className="text-[10px] font-medium text-slate-400">{lang.native}</p>
              </div>
              {active && <Check className="h-4 w-4 text-sky-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// One form for both "add" and "edit"
function VehicleForm({ title, form, setForm, onSubmit, onCancel, isPending, submitLabel }) {
  const { t } = useTranslation("profile");
  const models = form.brand ? CAR_BRANDS[form.brand] : null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-400">
          {t("vehicle.cancel")}
        </button>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            color: form.color.trim(),
            plateNumber: normalizePlate(form.plateNumber),
          });
        }}
      >
        <select
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value, model: "" })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          required
        >
          <option value="" disabled>
            {t("vehicle.selectBrand")}
          </option>
          {Object.keys(CAR_BRANDS).map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        {models ? (
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            required
          >
            <option value="" disabled>
              {t("vehicle.selectModel")}
            </option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder={form.brand ? t("vehicle.modelInput") : t("vehicle.modelPlaceholder")}
            disabled={!form.brand}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
            required
          />
        )}

        <input
          type="text"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          placeholder={t("vehicle.colorPlaceholder")}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
          required
        />

        <input
          type="text"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
          placeholder={t("vehicle.platePlaceholder")}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm uppercase outline-none focus:border-slate-400"
          required
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? t("vehicle.saving") : submitLabel}
        </button>
      </form>
    </div>
  );
}

function ProfilePage({ onNavigate }) {
  const { t, i18n } = useTranslation("profile");
  const queryClient = useQueryClient();

  const [tgUser, setTgUser] = useState(null);
  const [isDriverMode, setIsDriverMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [isAddingCar, setIsAddingCar] = useState(false);
  const [addCarForm, setAddCarForm] = useState(EMPTY_CAR);

  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editCarForm, setEditCarForm] = useState(EMPTY_CAR);

  const [isChoosingLanguage, setIsChoosingLanguage] = useState(false);

  const currentLanguage = i18n.resolvedLanguage ?? "uz";
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.label ?? "O'zbekcha";

  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    saveLanguage(code);
    setIsChoosingLanguage(false);
  };

  useEffect(() => {
    if (!tg) {
      console.log("Not running inside Telegram");
      return;
    }
    tg.ready();
    if (tg.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user);
  }, []);

  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: authenticateTelegram,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    data: vehicles,
    isLoading: vehiclesLoading,
    isError: vehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getTelegramUserVehicles,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createVehicleMutation = useMutation({
    mutationFn: createTelegramUserVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsAddingCar(false);
      setAddCarForm(EMPTY_CAR);
    },
    onError: (err) => {
      if(err.sessionExpired) return;
      console.error(err);
      showAlert(t("vehicle.addFailed"));
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ vehicleId, vehicleData }) => updateTelegramUserVehicle(vehicleId, vehicleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setEditingVehicleId(null);
      setEditCarForm(EMPTY_CAR);
    },
    onError: (err) => {
      if(err.sessionExpired) return;
      console.error(err);
      showAlert(t("vehicle.updateFailed"));
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: ({ vehicleId }) => deleteTelegramUserVehicle(vehicleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
    onError: (err) => {
      if(err.sessionExpired) return;
      console.error(err);
      showAlert(t("vehicle.deleteFailed"));
    },
  });

  if (isLoading) return <ProfilePageSkeleton />;
  if (isError) return <ProfileError error={error} onRetry={refetch} />;

  const profilePhoto = tgUser?.photo_url || null;
  const firstName = tgUser?.first_name || t("unknownUser");
  const lastName = tgUser?.last_name || "";
  const username = tgUser?.username ? `@${tgUser.username}` : "";
  const userInitials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`;

  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setEditCarForm({
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      plateNumber: vehicle.plateNumber,
    });
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (await showConfirm(t("vehicle.deleteConfirm"))) {
      deleteVehicleMutation.mutate({ vehicleId });
    }
  };

  const isDeleting = (id) =>
    deleteVehicleMutation.isPending && deleteVehicleMutation.variables?.vehicleId === id;

  const addButton = (extraClass) => (
    <button
      type="button"
      onClick={() => setIsAddingCar(true)}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 ${extraClass}`}
    >
      <Plus className="h-4 w-4" />
      {t("vehicle.add")}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label={t("back")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <div className="w-11" />
        </header>

        {/* Profile Info Card */}
        <section className="mt-5">
          <div className="flex flex-col items-center rounded-3xl bg-white p-5 text-center shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
            <div className="relative">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={firstName}
                  className="h-24 w-24 rounded-3xl object-cover shadow-md ring-4 ring-slate-50"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-sky-500 text-2xl font-extrabold text-white shadow-md ring-4 ring-slate-50">
                  {userInitials}
                </div>
              )}

              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white ring-2 ring-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-900">
              {firstName} {lastName}
            </h2>
            <p className="text-xs font-semibold text-sky-600">{username}</p>

            {/* Placeholder stats until the backend provides them */}
            <div className="mt-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-sm font-extrabold text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                  <span>4.9</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{t("stats.rating")}</span>
              </div>

              <div className="flex flex-col items-center border-x border-slate-200/80">
                <span className="text-sm font-extrabold text-slate-900">124</span>
                <span className="text-[10px] font-medium text-slate-400">{t("stats.trips")}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-sm font-extrabold text-slate-900">98%</span>
                <span className="text-[10px] font-medium text-slate-400">{t("stats.positive")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Driver Mode Switch */}
        <section className="mt-4">
          <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <CarFront className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">{t("driverMode.title")}</h3>
                <p className="text-[10px] font-medium text-slate-400">
                  {isDriverMode ? t("driverMode.on") : t("driverMode.off")}
                </p>
              </div>
            </div>

            <Toggle checked={isDriverMode} onChange={setIsDriverMode} label={t("driverMode.title")} />
          </div>
        </section>

        {/* Vehicles Section */}
        {isDriverMode && (
          <section className="mt-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-900">{t("vehicle.section")}</span>
              </div>

              {isAddingCar ? (
                <div className="mt-4">
                  <VehicleForm
                    title={t("vehicle.add")}
                    form={addCarForm}
                    setForm={setAddCarForm}
                    onSubmit={(data) => createVehicleMutation.mutate(data)}
                    onCancel={() => setIsAddingCar(false)}
                    isPending={createVehicleMutation.isPending}
                    submitLabel={t("vehicle.save")}
                  />
                </div>
              ) : vehiclesLoading ? (
                <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" />
              ) : vehiclesError ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{t("vehicle.loadError")}</p>
                  <button
                    type="button"
                    onClick={() => refetchVehicles()}
                    className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t("vehicle.retry")}
                  </button>
                </div>
              ) : vehicles?.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {vehicles.map((vehicle) =>
                    editingVehicleId === vehicle.id ? (
                      <VehicleForm
                        key={vehicle.id}
                        title={t("vehicle.edit")}
                        form={editCarForm}
                        setForm={setEditCarForm}
                        onSubmit={(data) =>
                          updateVehicleMutation.mutate({ vehicleId: vehicle.id, vehicleData: data })
                        }
                        onCancel={() => setEditingVehicleId(null)}
                        isPending={updateVehicleMutation.isPending}
                        submitLabel={t("vehicle.saveChanges")}
                      />
                    ) : (
                      <div
                        key={vehicle.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                          <CarFront className="h-5 w-5 text-slate-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400">
                            {vehicle.color} • {vehicle.plateNumber?.toUpperCase()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={t("vehicle.editAria")}
                            onClick={() => handleEditVehicle(vehicle)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            aria-label={t("vehicle.deleteAria")}
                            disabled={isDeleting(vehicle.id)}
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {addButton("p-3")}
                </div>
              ) : (
                <div className="mt-3">{addButton("p-4")}</div>
              )}
            </div>
          </section>
        )}

        {/* Settings Menu */}
        <section className="mt-4">
          {isChoosingLanguage ? (
            <LanguagePicker
              current={currentLanguage}
              onSelect={handleSelectLanguage}
              onBack={() => setIsChoosingLanguage(false)}
            />
          ) : (
            <div className="space-y-1 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
              {/* <div className="flex items-center justify-between rounded-2xl p-3 transition hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Bell className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {t("settings.notifications")}
                  </span>
                </div>
                <Toggle
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label={t("settings.notifications")}
                />
              </div> */}

              <button
                type="button"
                onClick={() => onNavigate("userAds")}
                className="flex w-full items-center justify-between rounded-2xl p-3 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{t("settings.userAds")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
    
              <button
                type="button"
                onClick={() => setIsChoosingLanguage(true)}
                className="flex w-full items-center justify-between rounded-2xl p-3 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{t("settings.language")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span>{currentLanguageLabel}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl p-3 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{t("settings.support")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;