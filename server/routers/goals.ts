import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

const goalStatusSchema = z.enum(["em_andamento", "concluida", "cancelada"]);

export const goalsRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllGoals();
  }),

  create: treasurerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        targetAmount: z.string().refine((v) => parseFloat(v) > 0, {
          message: "Valor alvo deve ser maior que zero",
        }),
        deadline: z.date().optional(),
        status: goalStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createGoal(input);
    }),

  update: treasurerProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        targetAmount: z
          .string()
          .refine((v) => parseFloat(v) > 0, { message: "Valor alvo deve ser maior que zero" })
          .optional(),
        deadline: z.date().optional(),
        status: goalStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateGoal(id, data);
    }),

  delete: treasurerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteGoal(input.id);
      return { success: true };
    }),

  contributions: router({
    list: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContributionsByGoal(input.goalId);
      }),

    create: treasurerProcedure
      .input(
        z.object({
          goalId: z.number(),
          amount: z.string().refine((v) => parseFloat(v) > 0, {
            message: "Valor deve ser maior que zero",
          }),
          contributionDate: z.date(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createContribution(input);
      }),
  }),
});
