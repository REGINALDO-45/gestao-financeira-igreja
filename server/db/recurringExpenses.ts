import { eq, asc } from "drizzle-orm";
import { recurringExpenses, type RecurringExpense } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllRecurringExpenses(): Promise<RecurringExpense[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.recurringExpenses].sort((a, b) => a.description.localeCompare(b.description));
  }

  return await db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.description));
}

export async function getActiveRecurringExpenses(): Promise<RecurringExpense[]> {
  const all = await getAllRecurringExpenses();
  return all.filter((r) => r.active);
}

export async function createRecurringExpense(data: any): Promise<RecurringExpense | undefined> {
  const db = await getDb();
  if (!db) {
    const newItem = {
      id: memoryStore.recurringExpenses.length + 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    memoryStore.recurringExpenses.push(newItem);
    return newItem;
  }

  const result = await db.insert(recurringExpenses).values(data).returning({ id: recurringExpenses.id });
  const id = result[0].id;
  const item = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).limit(1);
  return item.length > 0 ? item[0] : undefined;
}

export async function updateRecurringExpense(
  id: number,
  data: Partial<RecurringExpense>
): Promise<RecurringExpense | undefined> {
  const db = await getDb();
  if (!db) {
    const item = memoryStore.recurringExpenses.find((r) => r.id === id);
    if (item) Object.assign(item, data, { updatedAt: new Date() });
    return item;
  }

  await db.update(recurringExpenses).set(data).where(eq(recurringExpenses.id, id));
  const result = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteRecurringExpense(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    const idx = memoryStore.recurringExpenses.findIndex((r) => r.id === id);
    if (idx >= 0) memoryStore.recurringExpenses.splice(idx, 1);
    return;
  }

  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
}
