import type { Context as HonoContext } from "hono";
import { auth } from "@/auth/auth";
import { db } from "@/lib/db";

export async function createTRPCContext(honoCtx: HonoContext) {
  const session = await auth.api.getSession({ headers: honoCtx.req.raw.headers });

  return {
    db,
    headers: honoCtx.req.raw.headers,
    session: session?.session ?? null,
    user: session?.user ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
