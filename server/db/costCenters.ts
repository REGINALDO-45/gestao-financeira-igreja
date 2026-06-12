import { eq, desc } from "drizzle-orm";
import { costCenters, type CostCenter } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllCostCenters(): Promise<CostCenter[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.costCenters].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return await db
    .select()
    .from(costCenters)
    .orderBy(desc(costCenters.createdAt));
}

export async function createCostCenter(data: any): Promise<CostCenter | undefined> {
  const db = await getDb();
  if (!db) {
    const newCC = {
      id: memoryStore.costCenters.length + 1,
      name: "",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore.costCenters.push(newCC);
    return newCC;
  }

  const result = await db.insert(costCenters).values(data).returning({ id: costCenters.id });
  const id = result[0].id;
  const cc = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, id))
    .limit(1);
  return cc.length > 0 ? cc[0] : undefined;
}
