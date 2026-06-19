import { eq, desc, and, gte, lte } from "drizzle-orm";
import { entries, costCenters, type Entry } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllEntries(): Promise<Entry[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.entries].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }

  return await db.select().from(entries).orderBy(desc(entries.entryDate));
}

export async function getEntriesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Entry[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.entries.filter(e => {
      const d = new Date(e.entryDate);
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }

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
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.entries.filter(e => e.memberId === memberId)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }

  return await db
    .select()
    .from(entries)
    .where(eq(entries.memberId, memberId))
    .orderBy(desc(entries.entryDate));
}

export async function createEntry(data: any): Promise<Entry | undefined> {
  const db = await getDb();
  if (!db) {
    const newEntry = {
      id: memoryStore.entries.length + 1,
      memberId: null,
      entryDate: new Date(),
      category: "dizimo",
      amount: "0.00",
      paymentMethod: "pix",
      description: null,
      cultoSunday: null,
      costCenterId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore.entries.push(newEntry);
    return newEntry;
  }

  const result = await db.insert(entries).values(data).returning({ id: entries.id });
  const id = result[0].id;
  const entry = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);
  return entry.length > 0 ? entry[0] : undefined;
}

export async function updateEntry(
  id: number,
  data: Partial<Entry>
): Promise<Entry | undefined> {
  const db = await getDb();
  if (!db) {
    const entry = memoryStore.entries.find((e) => e.id === id);
    if (entry) {
      Object.assign(entry, data, { updatedAt: new Date() });
    }
    return entry;
  }

  await db.update(entries).set(data).where(eq(entries.id, id));
  const result = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export interface EntryCostCenterTotal {
  costCenterId: number | null;
  costCenterName: string | null;
  total: number;
}

export async function getEntryTotalsByCostCenter(
  startDate: Date,
  endDate: Date
): Promise<EntryCostCenterTotal[]> {
  const entriesInRange = await getEntriesByDateRange(startDate, endDate);

  const totalsByCenter = new Map<number, number>();
  for (const entry of entriesInRange) {
    if (entry.costCenterId == null) continue;
    totalsByCenter.set(
      entry.costCenterId,
      (totalsByCenter.get(entry.costCenterId) ?? 0) + parseFloat(entry.amount)
    );
  }

  if (totalsByCenter.size === 0) return [];

  const db = await getDb();
  let centers: { id: number; name: string }[];
  if (!db) {
    centers = memoryStore.costCenters;
  } else {
    centers = await db.select().from(costCenters);
  }

  const centerNameById = new Map(centers.map(c => [c.id, c.name]));

  return Array.from(totalsByCenter.entries()).map(([costCenterId, total]) => ({
    costCenterId,
    costCenterName: centerNameById.get(costCenterId) ?? null,
    total,
  }));
}
