import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // above 0 so a server-rendered page does not refetch the moment it hydrates
      queries: { staleTime: 30 * 1000 },
      dehydrate: {
        // the RSC transport can hydrate PENDING promises, so a server component
        // can start a query high in the tree and a client component further
        // down consumes it. without this, a non-awaited `prefetch` dehydrates
        // nothing and the client silently refetches everything.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// one client per browser session; a fresh one on the server per request.
export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
