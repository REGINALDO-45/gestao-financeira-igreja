import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

export const expensesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllExpenses();
  }),
  listByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await db.getExpensesByDateRange(input.startDate, input.endDate);
    }),
  create: treasurerProcedure
    .input(
      z.object({
        expenseDate: z.date(),
        category: z.enum([
          "agua",
          "energia",
          "internet",
          "aluguel",
          "material_limpeza",
          "evangelismo",
          "missoes",
          "construcao",
          "equipamentos",
          "manutencao",
          "outras_despesas",
        ]),
        amount: z.string(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]),
        paymentStatus: z.enum(["pendente", "pago", "cancelado"]).optional(),
        description: z.string().optional(),
        supplier: z.string().optional(),
        costCenterId: z.number().optional(),
        voucherUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createExpense(input);
    }),
  update: treasurerProcedure
    .input(
      z.object({
        id: z.number(),
        expenseDate: z.date().optional(),
        category: z
          .enum([
            "agua",
            "energia",
            "internet",
            "aluguel",
            "material_limpeza",
            "evangelismo",
            "missoes",
            "construcao",
            "equipamentos",
            "manutencao",
            "outras_despesas",
          ])
          .optional(),
        amount: z.string().optional(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]).optional(),
        paymentStatus: z.enum(["pendente", "pago", "cancelado"]).optional(),
        description: z.string().optional(),
        supplier: z.string().optional(),
        costCenterId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateExpense(id, data);
    }),
});
