import { Suspense } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../i18n"; // real translations (Uzbek by default), loaded like in the app

// Renders a component the way main.jsx does: React Query + Suspense for the translations.
// `me`: the logged-in user, for pages that AuthGate only shows after logging in.
export function renderWithApp(ui, { me } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (me) queryClient.setQueryData(["me"], me);
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{ui}</Suspense>
    </QueryClientProvider>
  );
}
