// queries/latestAds.js
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getLatestAds } from "../api/ad.api";

export const latestAdsQuery = (userId) =>
  infiniteQueryOptions({
    queryKey: ["latestAds", userId],
    queryFn: async ({ pageParam }) => {
      const res = await getLatestAds(pageParam, 10);
      if (!res.success) throw new Error(res.error ?? "Failed to load ads");
      return res;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!userId,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

export function useLatestAds(userId) {
  const query = useInfiniteQuery(latestAdsQuery(userId));
  const ads = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data]
  );
  return { ...query, ads };
}