import { publicProcedure, router } from "../trpc";
import { accountRouter } from "./account";
import { billingRouter } from "./billing";
import { developersRouter } from "./developers";
import { mappingsRouter } from "./mappings";
import { memberRouter } from "./member";
import { runRouter } from "./run";
import { workspaceRouter } from "./workspace";

export const appRouter = router({
  meta: router({
    health: publicProcedure.query(() => ({ ok: true as const, service: "fhirfix-backend" })),
  }),
  account: accountRouter,
  workspace: workspaceRouter,
  member: memberRouter,
  run: runRouter,
  mappings: mappingsRouter,
  billing: billingRouter,
  developers: developersRouter,
});

export type AppRouter = typeof appRouter;
