import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

import { churchSettingsRouter } from "./routers/churchSettings";
import { membersRouter } from "./routers/members";
import { entriesRouter } from "./routers/entries";
import { expensesRouter } from "./routers/expenses";
import { costCentersRouter } from "./routers/costCenters";
import { receiptsRouter } from "./routers/receipts";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  churchSettings: churchSettingsRouter,
  members: membersRouter,
  entries: entriesRouter,
  expenses: expensesRouter,
  costCenters: costCentersRouter,
  receipts: receiptsRouter,
});

export type AppRouter = typeof appRouter;
