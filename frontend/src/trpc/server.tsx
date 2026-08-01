import "server-only";

import type { AppRouter } from "@backend/app-router";
import { dehydrate, HydrationBoundary, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cookies } from "next/headers";
import { cache } from "react";
import { serverApiUrl } from "@/lib/env";
import { getQueryClient } from "./query-client";

export const getServerQueryClient = cache(getQueryClient);

export const serverApi = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${serverApiUrl()}/trpc`,
      async headers() {
        const store = await cookies();
        const header = store
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");
        return header ? { cookie: header } : {};
      },
    }),
  ],
});

export const trpcServer = createTRPCOptionsProxy<AppRouter>({
  client: serverApi,
  queryClient: getServerQueryClient,
});

export function HydrateClient({ children }: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}

export function prefetch<T extends { queryKey: [readonly unknown[], { type?: string }?] }>(
  options: T,
) {
  const queryClient: QueryClient = getServerQueryClient();
  if (options.queryKey[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(options as never);
  } else {
    void queryClient.prefetchQuery(options as never);
  }
}
