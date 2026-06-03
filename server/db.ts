import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  members,
  entries,
  expenses,
  costCenters,
  churchSettings,
  receipts,
  type Member,
  type Entry,
  type Expense,
  type CostCenter,
  type ChurchSettings,
  type Receipt,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Church Settings
export async function getChurchSettings(): Promise<ChurchSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(churchSettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertChurchSettings(
  data: Partial<ChurchSettings>
): Promise<ChurchSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getChurchSettings();

  if (existing) {
    await db
      .update(churchSettings)
      .set(data)
      .where(eq(churchSettings.id, existing.id));
    return { ...existing, ...data } as ChurchSettings;
  } else {
    const result = await db.insert(churchSettings).values(data as any);
    return { id: result[0].insertId, ...data } as any;
  }
}

// Members
export async function getAllMembers(): Promise<Member[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(members).orderBy(desc(members.createdAt));
}

export async function getMemberById(id: number): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(members)
    .where(eq(members.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMember(data: any): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(members).values(data);
  return getMemberById(result[0].insertId as number);
}

export async function updateMember(
  id: number,
  data: Partial<Member>
): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(members).set(data).where(eq(members.id, id));
  return getMemberById(id);
}

// Entries
export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(entries).orderBy(desc(entries.entryDate));
}

export async function getEntriesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Entry[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(entries)
    .where(
      and(
        gte(entries.entryDate, startDate),
        lte(entries.entryDate, endDate)
      )
    )
    .orderBy(desc(entries.entryDate));
}

export async function getEntriesByMember(memberId: number): Promise<Entry[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(entries)
    .where(eq(entries.memberId, memberId))
    .orderBy(desc(entries.entryDate));
}

export async function createEntry(data: any): Promise<Entry | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(entries).values(data);
  const id = result[0].insertId as number;
  const entry = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);
  return entry.length > 0 ? entry[0] : undefined;
}

// Expenses
export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpensesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Expense[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      )
    )
    .orderBy(desc(expenses.expenseDate));
}

export async function createExpense(data: any): Promise<Expense | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(expenses).values(data);
  const id = result[0].insertId as number;
  const expense = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return expense.length > 0 ? expense[0] : undefined;
}

export async function updateExpense(
  id: number,
  data: Partial<Expense>
): Promise<Expense | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(expenses).set(data).where(eq(expenses.id, id));
  const result = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Cost Centers
export async function getAllCostCenters(): Promise<CostCenter[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(costCenters)
    .orderBy(desc(costCenters.createdAt));
}

export async function createCostCenter(data: any): Promise<CostCenter | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(costCenters).values(data);
  const id = result[0].insertId as number;
  const cc = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, id))
    .limit(1);
  return cc.length > 0 ? cc[0] : undefined;
}

// Receipts
export async function createReceipt(data: any): Promise<Receipt | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(receipts).values(data);
  const id = result[0].insertId as number;
  const receipt = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .limit(1);
  return receipt.length > 0 ? receipt[0] : undefined;
}

export async function getReceiptsByMember(memberId: number): Promise<Receipt[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(receipts)
    .where(eq(receipts.memberId, memberId))
    .orderBy(desc(receipts.issuedDate));
}
