import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router, treasurerProcedure } from "../_core/trpc";
import { storagePut } from "../storage";

export const churchSettingsRouter = router({
  get: protectedProcedure.query(async () => {
    return await db.getChurchSettings();
  }),
  update: adminProcedure
    .input(
      z.object({
        churchName: z.string().optional(),
        pastorName: z.string().optional(),
        treasurerName: z.string().optional(),
        defaultVerse: z.string().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.upsertChurchSettings(input);
    }),
  uploadLogo: adminProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(`logos/${input.filename}`, buffer, input.contentType);
      return { url };
    }),
  markRecurringExpensesPrompted: treasurerProcedure
    .input(z.object({ month: z.string().length(7) }))
    .mutation(async ({ input }) => {
      return await db.upsertChurchSettings({ lastRecurringExpensePromptMonth: input.month });
    }),
});
