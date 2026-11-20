import { queryOptions, useQuery } from "@tanstack/react-query";
import { authenticateTelegram } from "../api/auth.api";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: authenticateTelegram,
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  retry: 1, // the default of 3 retries is too slow for auth
});

export const useMe = () => useQuery(meQuery);