import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

export const annualBudgetsRouter = router({
  getByYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      const result = await db.getAnnualBudgetByYear(input.year);
      return result ?? null;
    }),
  upsert: treasurerProcedure
    .input(
      z.object({
        year: z.number(),
        monthlyEntriesGoal: z.string(),
        monthlyExpensesGoal: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.upsertAnnualBudget(input);
      return result ?? null;
    }),
});
