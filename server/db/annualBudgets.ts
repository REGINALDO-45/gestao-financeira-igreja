import { eq } from "drizzle-orm";
import { annualBudgets, type AnnualBudget } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAnnualBudgetByYear(year: number): Promise<AnnualBudget | undefined> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.annualBudgets.find((b) => b.year === year);
  }

  const result = await db.select().from(annualBudgets).where(eq(annualBudgets.year, year)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertAnnualBudget(data: {
  year: number;
  monthlyEntriesGoal: string;
  monthlyExpensesGoal: string;
}): Promise<AnnualBudget | undefined> {
  const existing = await getAnnualBudgetByYear(data.year);
  const db = await getDb();

  if (!db) {
    if (existing) {
      Object.assign(existing, data, { updatedAt: new Date() });
      return existing;
    }
    const newItem = {
      id: memoryStore.annualBudgets.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    memoryStore.annualBudgets.push(newItem);
    return newItem;
  }

  if (existing) {
    await db.update(annualBudgets).set(data).where(eq(annualBudgets.id, existing.id));
    return { ...existing, ...data } as AnnualBudget;
  }

  const result = await db.insert(annualBudgets).values(data).returning({ id: annualBudgets.id });
  const item = await db.select().from(annualBudgets).where(eq(annualBudgets.id, result[0].id)).limit(1);
  return item.length > 0 ? item[0] : undefined;
}
