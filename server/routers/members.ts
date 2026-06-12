import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

export const membersRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllMembers();
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getMemberById(input.id);
    }),
  create: treasurerProcedure
    .input(
      z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        birthDate: z.date().optional(),
        baptismDate: z.date().optional(),
        status: z.enum(["regular", "atrasado", "inativo"]).optional(),
        isActiveTithePayer: z.boolean().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createMember(input);
    }),
  update: treasurerProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        birthDate: z.date().optional(),
        baptismDate: z.date().optional(),
        status: z.enum(["regular", "atrasado", "inativo"]).optional(),
        isActiveTithePayer: z.boolean().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateMember(id, data);
    }),
});
