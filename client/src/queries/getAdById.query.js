import { useQuery } from "@tanstack/react-query";
import { getAdById } from "../api/ad.api"; // adjust to where getAdById lives

// getAdById should return { ad, related }
export function useAd(id) {
  return useQuery({
    queryKey: ["ad", id],
    queryFn: () => getAdById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}