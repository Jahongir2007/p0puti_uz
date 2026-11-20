import React from "react";

export function HomePageSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 animate-pulse">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        {/* Header Skeleton */}
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-16 rounded-md bg-slate-200" />
            <div className="h-7 w-44 rounded-lg bg-slate-200" />
          </div>
          <div className="h-11 w-11 rounded-full bg-slate-200" />
        </header>

        {/* Hero Banner Skeleton */}
        <section className="mt-6 overflow-hidden rounded-3xl bg-slate-200 p-5">
          <div className="max-w-[280px] space-y-3">
            <div className="h-4 w-20 rounded bg-slate-300" />
            <div className="space-y-1.5">
              <div className="h-6 w-48 rounded bg-slate-300" />
              <div className="h-6 w-36 rounded bg-slate-300" />
            </div>
            <div className="space-y-1 pt-1">
              <div className="h-3 w-full rounded bg-slate-300" />
              <div className="h-3 w-4/5 rounded bg-slate-300" />
            </div>
          </div>
        </section>

        {/* Search Input Box Skeleton */}
        <section className="-mt-2 px-1">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 space-y-4">
            <div className="space-y-3">
              {/* Point 1 */}
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-14 rounded bg-slate-200" />
                  <div className="h-4 w-28 rounded bg-slate-200" />
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-14 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
              </div>
            </div>

            {/* Button Placeholder */}
            <div className="h-12 w-full rounded-2xl bg-slate-200" />
          </div>
        </section>

        {/* Quick Actions Skeleton */}
        <section className="mt-7">
          <div className="mb-3 h-5 w-32 rounded-md bg-slate-200" />

          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="space-y-1">
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Routes Skeleton */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-40 rounded-md bg-slate-200" />
            <div className="h-4 w-14 rounded-md bg-slate-200" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex min-w-0 items-center gap-3 w-full">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-36 rounded bg-slate-200" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-5 w-5 shrink-0 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </section>

        {/* Community Banner Skeleton */}
        <section className="mt-7 rounded-2xl bg-slate-900 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 rounded bg-slate-800" />
              <div className="space-y-1">
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-4/5 rounded bg-slate-800" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HomePageSkeleton;