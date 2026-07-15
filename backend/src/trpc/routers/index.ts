import { publicProcedure, router } from "../trpc";
import { accountRouter } from "./account";
import { billingRouter } from "./billing";
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
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
