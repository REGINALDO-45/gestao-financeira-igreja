import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

const budgetLineInput = z.object({
  category: z.string(),
  amount: z.string(),
});

export const budgetLinesRouter = router({
  getByYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      return await db.getBudgetLinesByYear(input.year);
    }),
  upsertMonth: treasurerProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        type: z.enum(["entrada", "despesa"]),
        lines: z.array(budgetLineInput),
      })
    )
    .mutation(async ({ input }) => {
      return await db.upsertMonthBudgetLines(input);
    }),
});
