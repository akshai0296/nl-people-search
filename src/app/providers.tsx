"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import { UpgradeProvider } from "@/components/upgrade";
import { ApiClientError } from "@/lib/api-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry what won't change on retry (not found, forbidden, bad input).
            retry: (count, error) =>
              count < 2 && !(error instanceof ApiClientError && error.status < 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UpgradeProvider>{children}</UpgradeProvider>
      </AuthProvider>
      <Toaster position="bottom-center" offset={88} mobileOffset={88} />
    </QueryClientProvider>
  );
}
