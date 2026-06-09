import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

export const receiptsRouter = router({
  listByMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await db.getReceiptsByMember(input.memberId);
    }),
  create: treasurerProcedure
    .input(
      z.object({
        entryId: z.number(),
        receiptNumber: z.string(),
        memberId: z.number(),
        amount: z.string(),
        category: z.string(),
        issuedDate: z.date(),
        pdfUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createReceipt(input);
    }),
});
