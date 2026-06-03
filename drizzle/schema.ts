import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for access control (admin, tesoureiro, visualizador).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "tesoureiro", "visualizador"]).default("visualizador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configurações da Igreja - dados institucionais utilizados nos relatórios
 */
export const churchSettings = mysqlTable("church_settings", {
  id: int("id").autoincrement().primaryKey(),
  churchName: varchar("churchName", { length: 255 }).notNull(),
  pastorName: varchar("pastorName", { length: 255 }).notNull(),
  treasurerName: varchar("treasurerName", { length: 255 }).notNull(),
  defaultVerse: text("defaultVerse"),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChurchSettings = typeof churchSettings.$inferSelect;
export type InsertChurchSettings = typeof churchSettings.$inferInsert;

/**
 * Membros da Igreja
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  birthDate: date("birthDate"),
  baptismDate: date("baptismDate"),
  status: mysqlEnum("status", ["regular", "atrasado", "inativo"]).default("regular").notNull(),
  isActiveTithePayer: boolean("isActiveTithePayer").default(false).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Centros de Custo - departamentos ou projetos da igreja
 */
export const costCenters = mysqlTable("cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;

/**
 * Entradas - dízimos, ofertas e outras receitas
 */
export const entries = mysqlTable("entries", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId"),
  entryDate: date("entryDate").notNull(),
  category: mysqlEnum("category", [
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
  ]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "dinheiro", "transferencia", "cartao", "deposito"]).notNull(),
  description: text("description"),
  cultoSunday: varchar("cultoSunday", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;

/**
 * Saídas - despesas da igreja
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseDate: date("expenseDate").notNull(),
  category: mysqlEnum("category", [
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
  ]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "dinheiro", "transferencia", "cartao", "deposito"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pendente", "pago", "cancelado"]).default("pendente").notNull(),
  description: text("description"),
  supplier: varchar("supplier", { length: 255 }),
  costCenterId: int("costCenterId"),
  voucherUrl: text("voucherUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Recibos - registros de recibos gerados para contribuições
 */
export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 50 }).notNull().unique(),
  memberId: int("memberId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  issuedDate: date("issuedDate").notNull(),
  pdfUrl: text("pdfUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;
