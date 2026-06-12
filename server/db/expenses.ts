import { eq, desc, and, gte, lte } from "drizzle-orm";
import { expenses, type Expense } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllExpenses(): Promise<Expense[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.expenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }

  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpensesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Expense[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.expenses.filter(e => {
      const d = new Date(e.expenseDate);
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }

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
  if (!db) {
    const newExpense = {
      id: memoryStore.expenses.length + 1,
      expenseDate: new Date(),
      category: "outras_despesas",
      amount: "0.00",
      paymentMethod: "pix",
      paymentStatus: "pendente",
      description: null,
      supplier: null,
      costCenterId: null,
      voucherUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore.expenses.push(newExpense);
    return newExpense;
  }

  const result = await db.insert(expenses).values(data).returning({ id: expenses.id });
  const id = result[0].id;
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
  if (!db) {
    const expense = memoryStore.expenses.find(e => e.id === id);
    if (expense) {
      Object.assign(expense, data, { updatedAt: new Date() });
    }
    return expense;
  }

  await db.update(expenses).set(data).where(eq(expenses.id, id));
  const result = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
