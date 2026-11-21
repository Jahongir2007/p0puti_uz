import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTelegramUserAds, deleteTelegramUserAd, updateTelegramUserAd } from "../api/ad.api";
import { useMe } from "./me.query";

export function useUserAds() {
  const { data: user } = useMe();

  const query = useInfiniteQuery({
    // user id in the key, so another account never sees cached ads
    queryKey: ["userAds", user?.id],
    queryFn: ({ pageParam }) => getTelegramUserAds({ cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user,
    staleTime: 30_000,
    refetchOnMount: "always", // new ads are created by a worker, so check again every visit
  });

  const ads = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  return { ...query, ads };
}

function updatePages(old, fn) {
  if (!old) return old;
  return { ...old, pages: old.pages.map((p) => ({ ...p, data: fn(p.data) })) };
}

const sameId = (a, b) => String(a) === String(b);

export function useDeleteUserAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adId) => deleteTelegramUserAd(adId),
    onSuccess: (_res, adId) => {
      queryClient.setQueriesData({ queryKey: ["userAds"] }, (old) =>
        updatePages(old, (ads) => ads.filter((ad) => !sameId(ad.id, adId)))
      );
      queryClient.invalidateQueries({ queryKey: ["latestAds"] });
    },
    onError: (error) => {
      // The ad was cancelled, expired or departed meanwhile: show the real list
      if (error.serverCode) queryClient.invalidateQueries({ queryKey: ["userAds"] });
    }
  });
}

export function useUpdateUserAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adId, payload }) => updateTelegramUserAd(adId, payload),
    onSuccess: (_res, { adId, payload }) => {
      queryClient.setQueriesData({ queryKey: ["userAds"] }, (old) =>
        updatePages(old, (ads) =>
          ads.map((ad) => (sameId(ad.id, adId) ? { ...ad, ...payload } : ad))
        )
      );
      queryClient.invalidateQueries({ queryKey: ["latestAds"] });
      queryClient.invalidateQueries({ queryKey: ["ad"] }); // use the key your useAd hook uses
    },
    onError: (error) => {
      // The ad was cancelled, expired or departed meanwhile: show the real list
      if (error.serverCode) queryClient.invalidateQueries({ queryKey: ["userAds"] });
    }
  });
}