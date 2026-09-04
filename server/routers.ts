import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { explainCase } from "./ai";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    explain: publicProcedure.input(z.object({
      caseData: z.object({
        id: z.string().min(1).max(128),
        transaction: z.object({ id: z.string(), amount: z.number().finite(), date: z.string(), description: z.string(), settlementId: z.string().optional(), groundTruth: z.enum(["match", "mismatch", "missing"]) }),
        settlement: z.object({ id: z.string(), amount: z.number().finite(), date: z.string(), reference: z.string(), description: z.string() }).optional(),
        matchType: z.enum(["exact", "fuzzy", "amount_only", "none"]),
        confidence: z.number().min(0).max(1),
        signals: z.object({ highValue: z.boolean(), duplicate: z.boolean(), missingSettlement: z.boolean(), amountMismatch: z.boolean(), riskScore: z.number().min(0).max(100) }),
        decision: z.enum(["auto_approve", "human_review", "refused"]),
        reason: z.string(),
        nextStep: z.string(),
        missingEvidence: z.array(z.string()),
        evidence: z.array(z.object({ id: z.string(), label: z.string(), value: z.string(), status: z.enum(["verified", "warning", "missing"]), provenance: z.object({ source: z.enum(["synthetic_fixture", "transactions_csv", "settlements_csv", "ledger_export"]), retrievedAt: z.string(), contentHash: z.string(), schemaVersion: z.literal("1.0") }) })),
        auditIds: z.array(z.string()),
      }),
      provider: z.enum(["gemini", "openrouter"]).default("gemini"),
    })).mutation(async ({ input }) => explainCase(input.caseData, input.provider)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
