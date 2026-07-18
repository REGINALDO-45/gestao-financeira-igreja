import { and, eq, notInArray } from "drizzle-orm";
import { budgetLines, type BudgetLine } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getBudgetLinesByYear(year: number): Promise<BudgetLine[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.budgetLines.filter((b) => b.year === year);
  }

  return await db.select().from(budgetLines).where(eq(budgetLines.year, year));
}

export async function upsertMonthBudgetLines(input: {
  year: number;
  month: number;
  type: "entrada" | "despesa";
  lines: { category: string; amount: string }[];
}): Promise<BudgetLine[]> {
  await ensureInitialized();
  const db = await getDb();
  const { year, month, type, lines } = input;
  const categories = lines.map((l) => l.category);

  if (!db) {
    memoryStore.budgetLines = memoryStore.budgetLines.filter(
      (b) => !(b.year === year && b.month === month && b.type === type && !categories.includes(b.category))
    );

    const results: BudgetLine[] = [];
    for (const line of lines) {
      const existing = memoryStore.budgetLines.find(
        (b) => b.year === year && b.month === month && b.type === type && b.category === line.category
      );
      if (existing) {
        Object.assign(existing, { amount: line.amount, updatedAt: new Date() });
        results.push(existing);
      } else {
        const nextId = memoryStore.budgetLines.reduce((max, b) => Math.max(max, b.id), 0) + 1;
        const newItem = {
          id: nextId,
          year,
          month,
          type,
          category: line.category,
          amount: line.amount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.budgetLines.push(newItem);
        results.push(newItem);
      }
    }
    return results;
  }

  if (categories.length > 0) {
    await db
      .delete(budgetLines)
      .where(
        and(
          eq(budgetLines.year, year),
          eq(budgetLines.month, month),
          eq(budgetLines.type, type),
          notInArray(budgetLines.category, categories)
        )
      );
  } else {
    await db
      .delete(budgetLines)
      .where(and(eq(budgetLines.year, year), eq(budgetLines.month, month), eq(budgetLines.type, type)));
  }

  const results: BudgetLine[] = [];
  for (const line of lines) {
    await db
      .insert(budgetLines)
      .values({ year, month, type, category: line.category, amount: line.amount })
      .onConflictDoUpdate({
        target: [budgetLines.year, budgetLines.month, budgetLines.type, budgetLines.category],
        set: { amount: line.amount, updatedAt: new Date() },
      });
  }
  const saved = await db
    .select()
    .from(budgetLines)
    .where(and(eq(budgetLines.year, year), eq(budgetLines.month, month), eq(budgetLines.type, type)));
  results.push(...saved);
  return results;
}
