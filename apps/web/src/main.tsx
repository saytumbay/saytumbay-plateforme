import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import "./styles/index.css";
import { router } from "./app/router";
import { ThemeProvider, useTheme } from "./lib/theme";
import { TooltipProvider } from "./components/ui/overlay";
import { ApiError, errorMessage } from "./lib/api";
import { registerServiceWorker } from "./lib/pwa";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
  mutationCache: new MutationCache({
    onError: (e, _v, _c, m) => {
      if (m.options.meta?.silent) return;
      if (e instanceof ApiError && e.status === 422) return; // affiché dans le formulaire
      if (e instanceof ApiError && e.status === 401) {
        queryClient.setQueryData(["session"], null);
        return;
      }
      toast.error(errorMessage(e));
    },
  }),
});

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}

const followRoutes = (onPath: (pathname: string) => void) => router.subscribe((s) => onPath(s.location.pathname));

function ThemedToaster() {
  const { dark } = useTheme();
  return <Toaster theme={dark ? "dark" : "light"} position="bottom-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider subscribe={followRoutes}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <ThemedToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

registerServiceWorker();
