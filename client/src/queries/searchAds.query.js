// queries/searchAds.query.js
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { searchAds } from "../api/ad.api";

export const searchAdsKeys = {
  all: ["ads", "search"],
  list: (params) => [...searchAdsKeys.all, params],
};

export function useSearchAds(params) {
  const query = useInfiniteQuery({
    queryKey: searchAdsKeys.list(params),
    queryFn: ({ pageParam }) => searchAds({ ...params, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!params,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    ads: query.data?.pages.flatMap((p) => p.data ?? []) ?? [],
  };
}