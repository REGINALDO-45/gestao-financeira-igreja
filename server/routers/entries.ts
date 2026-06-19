import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

export const entriesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllEntries();
  }),
  listByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await db.getEntriesByDateRange(input.startDate, input.endDate);
    }),
  listByMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await db.getEntriesByMember(input.memberId);
    }),
  summaryByCostCenter: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await db.getEntryTotalsByCostCenter(input.startDate, input.endDate);
    }),
  create: treasurerProcedure
    .input(
      z.object({
        memberId: z.number().optional(),
        entryDate: z.date(),
        category: z.enum([
          "dizimo",
          "oferta",
          "oferta_especial",
          "campanha",
          "missoes",
          "construcao",
          "bazar",
          "almoco_beneficente",
          "cantina",
          "doacao",
          "outras_receitas",
        ]),
        amount: z.string(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]),
        description: z.string().optional(),
        cultoSunday: z.string().optional(),
        costCenterId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createEntry(input);
    }),
  update: treasurerProcedure
    .input(
      z.object({
        id: z.number(),
        memberId: z.number().nullable().optional(),
        entryDate: z.date().optional(),
        category: z
          .enum([
            "dizimo",
            "oferta",
            "oferta_especial",
            "campanha",
            "missoes",
            "construcao",
            "bazar",
            "almoco_beneficente",
            "cantina",
            "doacao",
            "outras_receitas",
          ])
          .optional(),
        amount: z.string().optional(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]).optional(),
        description: z.string().optional(),
        cultoSunday: z.string().optional(),
        costCenterId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateEntry(id, data);
    }),
});
