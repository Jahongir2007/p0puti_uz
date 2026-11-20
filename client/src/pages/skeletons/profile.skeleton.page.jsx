import React from "react";
import Skeleton from "../../components/skeleton.component";

export function ProfilePageSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        
        {/* Header Skeleton */}
        <header className="flex items-center justify-between">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-xl" />
          <div className="w-11" />
        </header>

        {/* Profile Info Card Skeleton */}
        <section className="mt-5">
          <div className="flex flex-col items-center text-center rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
            {/* Avatar Skeleton */}
            <Skeleton className="h-24 w-24 rounded-3xl" />
            
            {/* Name and Username Skeleton */}
            <Skeleton className="mt-4 h-5 w-36 rounded-lg" />
            <Skeleton className="mt-2 h-3.5 w-24 rounded-md" />

            {/* Statistics Card Skeleton */}
            <div className="mt-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-4 w-10 rounded-md" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
              <div className="flex flex-col items-center gap-1.5 border-x border-slate-200/80">
                <Skeleton className="h-4 w-8 rounded-md" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-4 w-10 rounded-md" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
            </div>
          </div>
        </section>

        {/* Driver Mode Toggle Skeleton */}
        <section className="mt-4">
          <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </section>

        {/* Car Info Skeleton */}
        <section className="mt-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
            </div>
          </div>
        </section>

        {/* Settings Menu Skeleton */}
        <section className="mt-4">
          <div className="space-y-1 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                </div>
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        {/* Logout Button Skeleton */}
        <Skeleton className="mt-4 h-12 w-full rounded-2xl" />

      </div>
    </main>
  );
}

export default ProfilePageSkeleton;