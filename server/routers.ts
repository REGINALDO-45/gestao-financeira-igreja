import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// Procedure para admin apenas
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// Procedure para tesoureiro e admin
const treasurerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "tesoureiro") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Church Settings
  churchSettings: router({
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
  }),

  // Members
  members: router({
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
  }),

  // Entries (Dízimos e Ofertas)
  entries: router({
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
        })
      )
      .mutation(async ({ input }) => {
        return await db.createEntry(input);
      }),
  }),

  // Expenses (Saídas)
  expenses: router({
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
          paymentStatus: z.enum(["pendente", "pago", "cancelado"]).optional(),
          description: z.string().optional(),
          amount: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateExpense(id, data);
      }),
  }),

  // Cost Centers
  costCenters: router({
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
  }),

  // Receipts
  receipts: router({
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
  }),
});

export type AppRouter = typeof appRouter;
