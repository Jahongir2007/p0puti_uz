import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CarFront,
  Clock,
  Loader2,
  Minus,
  Plus,
  Send,
  UserCheck,
  UserRound,
  Users,
  Luggage,
  Timer,
  Flag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTelegramUserVehicles } from "../api/vehicle.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postTelegramUserAd } from "../api/ad.api";
import { CityInput } from "../components/cityInput.component";

// Today's date in Tashkent as YYYY-MM-DD.
// toISOString() uses UTC, which is still "yesterday" before 05:00 Tashkent time.
function tashkentToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

function CreateAdPage() {
  const { t } = useTranslation("createAd");
  const queryClient = useQueryClient();

  const [role, setRole] = useState("driver");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const today = tashkentToday();
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("08:00");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState(3);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [note, setNote] = useState("");

  const [durationHours, setDurationHours] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(0);

  const [allowGroupJoin, setAllowGroupJoin] = useState(true);
  const [allowLuggage, setAllowLuggage] = useState(true);

  const incrementSeats = () => seats < 8 && setSeats((prev) => prev + 1);
  const decrementSeats = () => seats > 1 && setSeats((prev) => prev - 1);

  const { data: vehicles, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getTelegramUserVehicles,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { mutate: createAdMutation, isPending: isCreatingAd } = useMutation({
    mutationFn: postTelegramUserAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAds"] });
      queryClient.invalidateQueries({ queryKey: ["latestAds"] });
    },
  });

  useEffect(() => {
    if (vehicles && vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id || vehicles[0]._id);
    }
  }, [vehicles]);

  const calculateArrivalTime = () => {
    if (!date || !time) return null;

    const [hours, minutes] = time.split(":").map(Number);
    const departureDate = new Date(date);
    departureDate.setHours(hours, minutes, 0, 0);

    const arrivalDate = new Date(
      departureDate.getTime() +
        (Number(durationHours) * 60 + Number(durationMinutes)) * 60 * 1000
    );

    const isNextDay = arrivalDate.getDate() !== departureDate.getDate();

    const arrivalTimeString = arrivalDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return { timeString: arrivalTimeString, isNextDay, fullDate: arrivalDate };
  };

  const arrivalInfo = calculateArrivalTime();

  // A driver without a saved car can't post (vehicleId would be 0)
  const driverHasNoVehicle =
    role === "driver" && !isVehiclesLoading && !(vehicles?.length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedVehicle = vehicles?.find((v) => (v.id || v._id) === selectedVehicleId);

    const adData = {
      role,
      from,
      to,
      date,
      time,
      price: Number(price),
      seats,
      note,
      ...(role === "driver"
        ? {
            vehicleId: Number(selectedVehicleId),
            carModel: selectedVehicle
              ? `${selectedVehicle.model} (${selectedVehicle.color})`
              : "",
            allowLuggage,
            estimatedDurationHours: Number(durationHours),
            estimatedDurationMinutes: Number(durationMinutes),
            calculatedArrivalTime: arrivalInfo ? arrivalInfo.timeString : null,
          }
        : { allowGroupJoin }),
    };

    createAdMutation(adData, {
      onSuccess: (data) => {
        console.log("Ad created:", data);
        alert(t("result.success"));
      },
      onError: (error) => {
        console.error("Failed to create ad:", error);
        alert(t("result.error"));
      },
    });
  };

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

        {/* Tab Switcher */}
        <div className="mt-5 flex rounded-2xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setRole("driver")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              role === "driver"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CarFront className="h-4 w-4" />
            {t("role.driver")}
          </button>
          <button
            type="button"
            onClick={() => setRole("passenger")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              role === "passenger"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserRound className="h-4 w-4" />
            {t("role.passenger")}
          </button>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 space-y-4">
            {/* Route */}
            <div className="space-y-3">
              <CityInput
                label={t("route.from")}
                value={from}
                onChange={setFrom}
                placeholder={t("route.fromPlaceholder")}
                iconClass="text-sky-500"
                required
              />
              <CityInput
                label={t("route.to")}
                value={to}
                onChange={setTo}
                placeholder={t("route.toPlaceholder")}
                iconClass="text-rose-500"
                required
              />
            </div>

            {/* Date and time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400">{t("date")}</p>
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full cursor-pointer bg-transparent text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400">{t("time")}</p>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full cursor-pointer bg-transparent text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Driver: duration and arrival */}
            {role === "driver" && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <Timer className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-slate-400">{t("duration.label")}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="48"
                          value={durationHours}
                          onChange={(e) => setDurationHours(e.target.value)}
                          className="w-10 bg-transparent text-sm font-semibold text-slate-900 outline-none text-center rounded bg-slate-200/50"
                        />
                        <span className="text-xs text-slate-500 font-medium">
                          {t("duration.hours")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(e.target.value)}
                          className="w-10 bg-transparent text-sm font-semibold text-slate-900 outline-none text-center rounded bg-slate-200/50"
                        />
                        <span className="text-xs text-slate-500 font-medium">
                          {t("duration.minutes")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {arrivalInfo && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100/80">
                    <Flag className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-900">
                      {t("arrival.label")}{" "}
                      <span className="font-bold text-emerald-700">{arrivalInfo.timeString}</span>
                      {arrivalInfo.isNextDay && (
                        <span className="ml-1 text-[10px] font-normal text-emerald-600">
                          {t("arrival.nextDay")}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Seats and price */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
                <div className="flex items-center gap-2 pl-1">
                  <Users className="h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">
                      {role === "driver" ? t("seats.driverLabel") : t("seats.passengerLabel")}
                    </p>
                    <p className="text-xs font-semibold text-slate-900">
                      {role === "driver"
                        ? t("seatCount", { count: seats })
                        : t("peopleCount", { count: seats })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={decrementSeats}
                    disabled={seats <= 1}
                    aria-label={t("seats.decrease")}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5 text-slate-700" />
                  </button>
                  <span className="w-3 text-center text-xs font-bold">{seats}</span>
                  <button
                    type="button"
                    onClick={incrementSeats}
                    disabled={seats >= 8}
                    aria-label={t("seats.increase")}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-90 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    {role === "driver" ? t("price.driverLabel") : t("price.passengerLabel")}
                  </p>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={t("price.placeholder")}
                    className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">{t("price.currency")}</span>
              </div>
            </div>

            {/* Driver: vehicle */}
            {role === "driver" && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <CarFront className="h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">{t("vehicle.label")}</p>

                  {isVehiclesLoading ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                      <span>{t("vehicle.loading")}</span>
                    </div>
                  ) : vehicles && vehicles.length > 0 ? (
                    <select
                      required
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none cursor-pointer"
                    >
                      {vehicles.map((vehicle) => {
                        const id = vehicle.id || vehicle._id;
                        return (
                          <option key={id} value={id}>
                            {vehicle.brand} {vehicle.model}{" "}
                            {vehicle.color ? `(${vehicle.color})` : ""} -{" "}
                            {vehicle.plateNumber?.toUpperCase() || vehicle.number || ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <p className="text-xs font-medium text-rose-500 py-0.5">{t("vehicle.none")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Driver: luggage */}
            {role === "driver" && (
              <div className="rounded-2xl bg-sky-50/60 p-3.5 ring-1 ring-sky-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
                      <Luggage className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">{t("luggage.title")}</p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowLuggage}
                    aria-label={t("luggage.title")}
                    onClick={() => setAllowLuggage(!allowLuggage)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowLuggage ? "bg-sky-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowLuggage ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  {allowLuggage ? t("luggage.yes") : t("luggage.no")}
                </p>
              </div>
            )}

            {/* Passenger: group join */}
            {role === "passenger" && (
              <div className="rounded-2xl bg-sky-50/60 p-3.5 ring-1 ring-sky-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t("group.title")}</p>
                      <p className="text-[10px] text-slate-500">{t("group.subtitle")}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowGroupJoin}
                    aria-label={t("group.title")}
                    onClick={() => setAllowGroupJoin(!allowGroupJoin)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowGroupJoin ? "bg-sky-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowGroupJoin ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  {allowGroupJoin ? t("group.yes") : t("group.no")}
                </p>
              </div>
            )}

            {/* Note */}
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[11px] font-medium text-slate-400">{t("note.label")}</p>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("note.placeholder")}
                className="mt-1 w-full bg-transparent text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isCreatingAd || (role === "driver" && isVehiclesLoading) || driverHasNoVehicle}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isCreatingAd ? t("submit.pending") : t("submit.idle")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreateAdPage;