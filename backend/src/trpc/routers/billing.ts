import {
  dollarsFromMicro,
  evaluateAutoRecharge,
  isPurchasableCents,
  MICRO_PER_DOLLAR,
  PRICING,
  PURCHASABLE_CENTS,
} from "@shared/db/credits";
import { ensureBillingAccount } from "@shared/db/ledger";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { schema } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  createCheckout,
  createPremiumCheckout,
  isBillingConfigured,
  premiumProductId,
  productIdForPack,
} from "@/lib/polar";
import { rateLimit } from "@/lib/redis";
import { router, workspaceProcedure } from "../trpc";

const CHECKOUT_LIMIT = 10;
const CHECKOUT_WINDOW_SECONDS = 60 * 10;

// all money leaves this router as dollars; micro-credits stay server-side.
function requireManage(role: string) {
  if (!hasPermission(role as never, "billing", "manage")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage billing." });
  }
}

// start of the current billing cycle (calendar month) for spend-cap accounting.
function cycleStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const billingRouter = router({
  summary: workspaceProcedure.query(async ({ ctx }) => {
    const account = await ensureBillingAccount(ctx.db, ctx.workspaceId);
    const balanceMicro = account?.balanceMicroCredits ?? 0;

    const [settings] = await ctx.db
      .select({ planTier: schema.workspaceSettings.planTier })
      .from(schema.workspaceSettings)
      .where(eq(schema.workspaceSettings.workspaceId, ctx.workspaceId))
      .limit(1);

    // burn: sum of debits over the last 30 days -> daily average -> monthly estimate.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [burn] = await ctx.db
      .select({
        spentMicro: sql<number>`coalesce(-sum(${schema.creditLedgerEntry.amountMicroCredits}), 0)`,
      })
      .from(schema.creditLedgerEntry)
      .where(
        and(
          eq(schema.creditLedgerEntry.workspaceId, ctx.workspaceId),
          eq(schema.creditLedgerEntry.type, "debit"),
          gte(schema.creditLedgerEntry.createdAt, since),
        ),
      );
    const spentLast30Micro = Number(burn?.spentMicro ?? 0);
    const dailyBurnMicro = spentLast30Micro / 30;
    const estimatedMonthlyMicro = Math.round(dailyBurnMicro * 30);
    const daysRemaining = dailyBurnMicro > 0 ? Math.floor(balanceMicro / dailyBurnMicro) : null;

    // purchases this cycle, for the auto-recharge cap gotcha.
    const [cycleSpend] = await ctx.db
      .select({
        cents: sql<number>`coalesce(sum(${schema.invoice.amountCents}), 0)`,
      })
      .from(schema.invoice)
      .where(
        and(
          eq(schema.invoice.workspaceId, ctx.workspaceId),
          eq(schema.invoice.status, "paid"),
          gte(schema.invoice.issuedAt, cycleStart()),
        ),
      );
    const spentThisCycleCents = Number(cycleSpend?.cents ?? 0);

    const autoRecharge = evaluateAutoRecharge({
      balanceMicro,
      enabled: account?.autoRechargeEnabled ?? false,
      thresholdMicro: account?.autoRechargeThreshold ?? null,
      rechargeAmountCents: account?.autoRechargeAmountCents ?? null,
      spendThisCycleCents: spentThisCycleCents,
      monthlySpendCapCents: account?.monthlySpendCapCents ?? null,
    });

    // has the workspace ever purchased? if not, they are on trial credits.
    const [firstPurchase] = await ctx.db
      .select({ id: schema.invoice.id })
      .from(schema.invoice)
      .where(
        and(eq(schema.invoice.workspaceId, ctx.workspaceId), eq(schema.invoice.status, "paid")),
      )
      .limit(1);

    return {
      balanceDollars: dollarsFromMicro(balanceMicro),
      // a resource costs perResourceCents; how many resources the balance covers.
      resourcesRemaining: Math.floor(
        balanceMicro / (PRICING.perResourceCents * (MICRO_PER_DOLLAR / 100)),
      ),
      dailyBurnDollars: dollarsFromMicro(dailyBurnMicro),
      estimatedMonthlyDollars: dollarsFromMicro(estimatedMonthlyMicro),
      daysRemaining,
      isTrial: !firstPurchase,
      billingConfigured: isBillingConfigured(),
      autoRecharge: {
        enabled: account?.autoRechargeEnabled ?? false,
        thresholdDollars:
          account?.autoRechargeThreshold != null
            ? dollarsFromMicro(account.autoRechargeThreshold)
            : null,
        amountCents: account?.autoRechargeAmountCents ?? null,
        blockedByCap: autoRecharge.blockedByCap,
      },
      spendCap: {
        monthlyCents: account?.monthlySpendCapCents ?? null,
        spentThisCycleCents,
      },
      packs: PRICING.packs.map((p) => ({ id: p.id, label: p.label, cents: p.cents })),
      plan: {
        tier: settings?.planTier ?? "free",
        premiumCents: PRICING.premium.cents,
        premiumLabel: PRICING.premium.label,
        // false when no product is configured, so the ui does not offer a dead button
        purchasable: premiumProductId() != null,
      },
    };
  }),

  usage: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), days: z.number().int().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      // join debit ledger entries to their run to bucket by source.
      const rows = await ctx.db
        .select({
          day: sql<string>`to_char(${schema.creditLedgerEntry.createdAt}, 'YYYY-MM-DD')`,
          source: sql<string>`coalesce(${schema.run.source}, 'other')`,
          spentMicro: sql<number>`-sum(${schema.creditLedgerEntry.amountMicroCredits})`,
        })
        .from(schema.creditLedgerEntry)
        .leftJoin(schema.run, eq(schema.creditLedgerEntry.relatedRunId, schema.run.id))
        .where(
          and(
            eq(schema.creditLedgerEntry.workspaceId, ctx.workspaceId),
            eq(schema.creditLedgerEntry.type, "debit"),
            gte(schema.creditLedgerEntry.createdAt, since),
          ),
        )
        .groupBy(
          sql`to_char(${schema.creditLedgerEntry.createdAt}, 'YYYY-MM-DD')`,
          sql`coalesce(${schema.run.source}, 'other')`,
        );

      return rows.map((r) => ({
        day: r.day,
        source: r.source,
        dollars: dollarsFromMicro(Number(r.spentMicro)),
      }));
    }),

  // the append-only ledger, newest first, paginated.
  ledger: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: schema.creditLedgerEntry.id,
          type: schema.creditLedgerEntry.type,
          amountMicro: schema.creditLedgerEntry.amountMicroCredits,
          balanceAfter: schema.creditLedgerEntry.balanceAfter,
          description: schema.creditLedgerEntry.description,
          relatedRunId: schema.creditLedgerEntry.relatedRunId,
          createdAt: schema.creditLedgerEntry.createdAt,
        })
        .from(schema.creditLedgerEntry)
        .where(eq(schema.creditLedgerEntry.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.creditLedgerEntry.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows.map((r) => ({
        ...r,
        amountDollars: dollarsFromMicro(r.amountMicro),
        balanceAfterDollars: dollarsFromMicro(r.balanceAfter),
      }));
    }),

  // paid + voided purchase records for the invoices table.
  invoices: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: schema.invoice.id,
        amountCents: schema.invoice.amountCents,
        creditsPurchasedMicro: schema.invoice.creditsPurchasedMicro,
        status: schema.invoice.status,
        issuedAt: schema.invoice.issuedAt,
        paidAt: schema.invoice.paidAt,
      })
      .from(schema.invoice)
      .where(eq(schema.invoice.workspaceId, ctx.workspaceId))
      .orderBy(desc(schema.invoice.issuedAt))
      .limit(100);
  }),

  checkout: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      if (!isBillingConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Billing is not configured yet.",
        });
      }
      const rl = await rateLimit(
        `checkout:${ctx.workspaceId}`,
        CHECKOUT_LIMIT,
        CHECKOUT_WINDOW_SECONDS,
      );
      if (!rl.allowed) {
        logger.warn("billing.checkout", `rate limited ${ctx.workspaceId}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many checkout attempts. Wait a few minutes and try again.",
        });
      }

      const pack = PRICING.packs.find((p) => p.id === input.packId);
      if (!pack) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown pack." });

      const productId = productIdForPack(pack.id);
      if (!productId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This credit pack is not available yet.",
        });
      }

      await ensureBillingAccount(ctx.db, ctx.workspaceId);
      const checkout = await createCheckout({
        packId: pack.id,
        productId,
        workspaceId: ctx.workspaceId,
        creditsMicro: pack.creditsMicro,
        customerExternalId: ctx.workspaceId,
      });
      logger.info("billing.checkout", `${ctx.workspaceId} -> ${pack.id} (${checkout.id})`);
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "billing.checkout_started",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: checkout.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { packId: pack.id },
      });
      return { url: checkout.url };
    }),

  // the tier is granted by the subscription webhook, never here
  upgradeToPremium: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      const productId = premiumProductId();
      if (!isBillingConfigured() || !productId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The premium plan is not available yet.",
        });
      }
      const checkout = await createPremiumCheckout({
        productId,
        workspaceId: input.workspaceId,
        customerExternalId: ctx.workspaceId,
      });
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "billing.checkout_started",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: checkout.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { plan: "premium" },
      });
      return { url: checkout.url };
    }),

  setAutoRecharge: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        enabled: z.boolean(),
        thresholdDollars: z.number().min(0).max(10000).optional(),
        amountCents: z
          .number()
          .int()
          .refine(isPurchasableCents, {
            message: `Recharge amount must be one of: ${PURCHASABLE_CENTS.join(", ")} cents.`,
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      await ensureBillingAccount(ctx.db, ctx.workspaceId);

      if (input.enabled && (input.thresholdDollars == null || input.amountCents == null)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Set both a trigger balance and a recharge amount to enable auto-recharge.",
        });
      }

      await ctx.db
        .update(schema.billingAccount)
        .set({
          autoRechargeEnabled: input.enabled,
          autoRechargeThreshold:
            input.thresholdDollars != null
              ? Math.round(input.thresholdDollars * MICRO_PER_DOLLAR)
              : null,
          autoRechargeAmountCents: input.amountCents ?? null,
        })
        .where(eq(schema.billingAccount.workspaceId, ctx.workspaceId));

      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "billing.auto_recharge_changed",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: {
          enabled: input.enabled,
          thresholdDollars: input.thresholdDollars ?? null,
          amountCents: input.amountCents ?? null,
        },
      });
      return { enabled: input.enabled };
    }),

  setSpendCap: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        monthlyCents: z.number().int().min(0).max(10_000_00).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      await ensureBillingAccount(ctx.db, ctx.workspaceId);
      await ctx.db
        .update(schema.billingAccount)
        .set({ monthlySpendCapCents: input.monthlyCents })
        .where(eq(schema.billingAccount.workspaceId, ctx.workspaceId));
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "billing.spend_cap_changed",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { monthlyCents: input.monthlyCents },
      });
      return { monthlyCents: input.monthlyCents };
    }),
});
