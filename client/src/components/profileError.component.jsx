import React from "react";
import { AlertCircle, RefreshCw, MessageSquare, ArrowLeft } from "lucide-react";
import { openSupport, supportUsername } from "../utils/support";

export function ProfileError({ error, onRetry }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-4 pb-10 pt-5">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Orqaga"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Profil</h1>
          <div className="w-11" />
        </header>

        {/* Error Card */}
        <section className="my-auto flex flex-col items-center text-center">
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
            {/* Warning Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-8 ring-rose-50/50">
              <AlertCircle className="h-8 w-8" />
            </div>

            {/* Error Message */}
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Ma'lumotlarni yuklab bo'lmadi
            </h2>
            <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed max-w-xs">
              {error?.message || "Tarmoqda xatolik yuz berdi. Iltimos, internet aloqasini tekshiring va qaytadan urinib ko'ring."}
            </p>

            {/* Actions */}
            <div className="mt-6 space-y-2.5 w-full">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Qaytadan urinish
                </button>
              )}

              {supportUsername && (
                <button
                  type="button"
                  onClick={openSupport}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-xs font-bold text-slate-700 transition active:scale-[0.98] hover:bg-slate-200/80"
                >
                  <MessageSquare className="h-4 w-4" />
                  Qo'llab-quvvatlash xizmati
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Note */}
        <footer className="text-center">
          <p className="text-[11px] font-medium text-slate-400">
            Agar muammo takrorlanaversa, dasturni qayta ishga tushiring
          </p>
        </footer>

      </div>
    </main>
  );
}

export default ProfileError;