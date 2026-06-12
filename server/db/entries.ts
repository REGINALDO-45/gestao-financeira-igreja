import { eq, desc, and, gte, lte } from "drizzle-orm";
import { entries, type Entry } from "../../drizzle/schema";
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
