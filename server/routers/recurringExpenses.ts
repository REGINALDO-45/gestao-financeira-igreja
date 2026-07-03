import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

const expenseCategorySchema = z.enum([
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
]);

export const recurringExpensesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllRecurringExpenses();
  }),
  listActive: protectedProcedure.query(async () => {
    return await db.getActiveRecurringExpenses();
  }),
  create: treasurerProcedure
    .input(
      z.object({
        category: expenseCategorySchema,
        description: z.string().min(1),
        amount: z.string(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createRecurringExpense(input);
    }),
  update: treasurerProcedure
    .input(
      z.object({
        id: z.number(),
        category: expenseCategorySchema.optional(),
        description: z.string().min(1).optional(),
        amount: z.string().optional(),
        paymentMethod: z.enum(["pix", "dinheiro", "transferencia", "cartao", "deposito"]).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateRecurringExpense(id, data);
    }),
  delete: treasurerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteRecurringExpense(input.id);
      return { success: true };
    }),
});
