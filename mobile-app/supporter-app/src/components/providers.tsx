import React, { useEffect, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { AuthProvider, useAuth } from "@/context/auth";
import { makeQueryClient } from "@/lib/query-client";
import { trpc } from "@/lib/trpc";
import { API_BASE_URL } from "@/lib/api-url";

function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const tokenRef = useRef(token);
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_BASE_URL}/api/trpc`,
          transformer: superjson,
          headers() {
            const t = tokenRef.current;
            return t ? { Authorization: `Bearer ${t}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </AuthProvider>
  );
}
