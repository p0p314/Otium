import { ThemeProvider } from "@otium/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "../lib/query-client";
import { router } from "../router";

/** Compose les providers applicatifs (thème, données serveur, routing). */
export function AppProviders() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
