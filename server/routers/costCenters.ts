import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

export const costCentersRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllCostCenters();
  }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createCostCenter(input);
    }),
});
