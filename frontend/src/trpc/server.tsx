import "server-only";

import type { AppRouter } from "@backend/app-router";
import { dehydrate, HydrationBoundary, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "@/lib/env";
import { getQueryClient } from "./query-client";

/**
 * server-side tRPC, so a page can arrive with its data already in the html.
 *
 * every page in this app used to be a client component that mounted, THEN
 * fetched. that is why a report showed a full-page spinner for a run that
 * completes in 1.33s on average - the wait was not the engine, it was the
 * round trip we only started after react hydrated.
 *
 * our tRPC server is a separate backend on another origin, so this goes over
 * http (a `client`), not an in-process `router` caller. the session cookie is
 * readable here only because next.config rewrites /api/auth/* through this
 * origin, which makes it first-party - see proxy.ts.
 */

// one query client per request. `cache` keys it to the react request scope, so
// every prefetch in a single render shares a client and hydrates as one payload.
export const getServerQueryClient = cache(getQueryClient);

/**
 * the raw client, for server code that needs a value NOW rather than a set of
 * query options - resolving a slug to an id before deciding what to prefetch,
 * for instance. `trpcServer` (the options proxy) is for prefetching.
 */
export const serverApi = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.NEXT_PUBLIC_API_URL}/trpc`,
      async headers() {
        // forward the caller's cookies so the backend sees the same session it
        // would on a client-side call. without this every prefetch is anonymous
        // and the page hydrates empty.
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

/**
 * wrap a server component's output so whatever it prefetched is available to
 * the client components inside it without a second fetch.
 */
export function HydrateClient({ children }: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}

/**
 * run a query on the server and put the result in the request's cache, so the
 * client hydrates with it instead of fetching again.
 *
 * this AWAITS. an earlier version fired the query and returned immediately,
 * which meant `dehydrate()` ran before the data landed and the payload went out
 * empty - the client then refetched exactly as before and the whole exercise
 * did nothing. verified by watching `run.list` still appear in the browser's
 * network calls.
 *
 * awaiting costs the server a round trip it is far better placed to make than
 * the browser: it is on the same network as the backend, and it removes a
 * client waterfall rather than adding to one.
 */
export async function prefetch<T extends { queryKey: unknown[] }>(options: T) {
  const queryClient: QueryClient = getServerQueryClient();
  await queryClient.prefetchQuery(options as never);
}
