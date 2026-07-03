import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  boolean,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────
// Enums (Postgres requires named enum types — MySQL's inline
// `mysqlEnum` becomes a shared `pgEnum` referenced by columns)
// ─────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["admin", "tesoureiro", "visualizador"]);

export const memberStatusEnum = pgEnum("member_status", ["regular", "atrasado", "inativo"]);

export const entryCategoryEnum = pgEnum("entry_category", [
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
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
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

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "dinheiro",
  "transferencia",
  "cartao",
  "deposito",
]);

export const paymentStatusEnum = pgEnum("payment_status", ["pendente", "pago", "cancelado"]);

/**
 * Core user table backing auth flow.
 * Extended with role field for access control (admin, tesoureiro, visualizador).
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("visualizador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configurações da Igreja - dados institucionais utilizados nos relatórios
 */
export const churchSettings = pgTable("church_settings", {
  id: serial("id").primaryKey(),
  churchName: varchar("churchName", { length: 255 }).notNull(),
  pastorName: varchar("pastorName", { length: 255 }).notNull(),
  treasurerName: varchar("treasurerName", { length: 255 }).notNull(),
  defaultVerse: text("defaultVerse"),
  logoUrl: text("logoUrl"),
  // Último mês (formato "YYYY-MM") em que o usuário já foi questionado sobre
  // lançar as despesas recorrentes do mês — evita perguntar mais de uma vez.
  lastRecurringExpensePromptMonth: varchar("lastRecurringExpensePromptMonth", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ChurchSettings = typeof churchSettings.$inferSelect;
export type InsertChurchSettings = typeof churchSettings.$inferInsert;

/**
 * Membros da Igreja
 */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  birthDate: date("birthDate", { mode: "date" }),
  baptismDate: date("baptismDate", { mode: "date" }),
  status: memberStatusEnum("status").default("regular").notNull(),
  isActiveTithePayer: boolean("isActiveTithePayer").default(false).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Centros de Custo - departamentos ou projetos da igreja
 */
export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;

/**
 * Entradas - dízimos, ofertas e outras receitas
 */
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId").references(() => members.id),
  entryDate: date("entryDate", { mode: "date" }).notNull(),
  category: entryCategoryEnum("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  description: text("description"),
  cultoSunday: varchar("cultoSunday", { length: 50 }),
  costCenterId: integer("costCenterId").references(() => costCenters.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;

/**
 * Saídas - despesas da igreja
 */
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: date("expenseDate", { mode: "date" }).notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  paymentStatus: paymentStatusEnum("paymentStatus").default("pendente").notNull(),
  description: text("description"),
  supplier: varchar("supplier", { length: 255 }),
  costCenterId: integer("costCenterId").references(() => costCenters.id),
  voucherUrl: text("voucherUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Modelos de despesas recorrentes (ex: água, energia, zeladoria) usados para
 * pré-preencher o lançamento de saídas do mês, uma vez por mês.
 */
export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  category: expenseCategoryEnum("category").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = typeof recurringExpenses.$inferInsert;

/**
 * Recibos - registros de recibos gerados para contribuições
 */
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  entryId: integer("entryId").notNull().references(() => entries.id),
  receiptNumber: varchar("receiptNumber", { length: 50 }).notNull().unique(),
  memberId: integer("memberId").notNull().references(() => members.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  issuedDate: date("issuedDate", { mode: "date" }).notNull(),
  pdfUrl: text("pdfUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;
