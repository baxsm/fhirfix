import { publicProcedure, router } from "../trpc";
import { accountRouter } from "./account";
import { auditRouter } from "./audit";
import { billingRouter } from "./billing";
import { conformanceRouter } from "./conformance";
import { developersRouter } from "./developers";
import { mappingsRouter } from "./mappings";
import { memberRouter } from "./member";
import { monitoringRouter } from "./monitoring";
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
  monitoring: monitoringRouter,
  conformance: conformanceRouter,
  billing: billingRouter,
  developers: developersRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
