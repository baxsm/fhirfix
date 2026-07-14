import { publicProcedure, router } from "../trpc";
import { accountRouter } from "./account";
import { memberRouter } from "./member";
import { workspaceRouter } from "./workspace";

export const appRouter = router({
  meta: router({
    health: publicProcedure.query(() => ({ ok: true as const, service: "fhirfix-backend" })),
  }),
  account: accountRouter,
  workspace: workspaceRouter,
  member: memberRouter,
});

export type AppRouter = typeof appRouter;
