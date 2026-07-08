import { eq, desc } from "drizzle-orm";
import { goals, type Goal } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllGoals(): Promise<Goal[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.goals].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return await db.select().from(goals).orderBy(desc(goals.createdAt));
}

export async function createGoal(data: any): Promise<Goal | undefined> {
  const db = await getDb();
  if (!db) {
    const newGoal = {
      id: memoryStore.goals.length + 1,
      description: null,
      currentAmount: "0",
      deadline: null,
      status: "em_andamento",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    memoryStore.goals.push(newGoal);
    return newGoal;
  }

  const result = await db.insert(goals).values(data).returning({ id: goals.id });
  const id = result[0].id;
  const goal = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  return goal.length > 0 ? goal[0] : undefined;
}

export async function updateGoal(id: number, data: Partial<Goal>): Promise<Goal | undefined> {
  const db = await getDb();
  if (!db) {
    const item = memoryStore.goals.find((g) => g.id === id);
    if (item) Object.assign(item, data, { updatedAt: new Date() });
    return item;
  }

  await db.update(goals).set(data).where(eq(goals.id, id));
  const result = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteGoal(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    const idx = memoryStore.goals.findIndex((g) => g.id === id);
    if (idx >= 0) memoryStore.goals.splice(idx, 1);
    return;
  }

  await db.delete(goals).where(eq(goals.id, id));
}
