import { eq, desc } from "drizzle-orm";
import { receipts, type Receipt } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function createReceipt(data: any): Promise<Receipt | undefined> {
  const db = await getDb();
  if (!db) {
    const newReceipt = {
      id: memoryStore.receipts.length + 1,
      entryId: 0,
      receiptNumber: "",
      memberId: 0,
      amount: "0.00",
      category: "",
      issuedDate: new Date(),
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore.receipts.push(newReceipt);
    return newReceipt;
  }

  const result = await db.insert(receipts).values(data).returning({ id: receipts.id });
  const id = result[0].id;
  const receipt = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .limit(1);
  return receipt.length > 0 ? receipt[0] : undefined;
}

export async function getReceiptsByMember(memberId: number): Promise<Receipt[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.receipts.filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  }

  return await db
    .select()
    .from(receipts)
    .where(eq(receipts.memberId, memberId))
    .orderBy(desc(receipts.issuedDate));
}
