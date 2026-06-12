import { eq, desc } from "drizzle-orm";
import { members, type Member } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getAllMembers(): Promise<Member[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return [...memoryStore.members].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return await db.select().from(members).orderBy(desc(members.createdAt));
}

export async function getMemberById(id: number): Promise<Member | undefined> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.members.find(m => m.id === id);
  }

  const result = await db
    .select()
    .from(members)
    .where(eq(members.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMember(data: any): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) {
    const newMember = {
      id: memoryStore.members.length + 1,
      name: "",
      phone: null,
      email: null,
      address: null,
      birthDate: null,
      baptismDate: null,
      status: "regular",
      isActiveTithePayer: false,
      observations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore.members.push(newMember);
    return newMember;
  }

  const result = await db.insert(members).values(data).returning({ id: members.id });
  return getMemberById(result[0].id);
}

export async function updateMember(
  id: number,
  data: Partial<Member>
): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) {
    const member = memoryStore.members.find(m => m.id === id);
    if (member) {
      Object.assign(member, data, { updatedAt: new Date() });
    }
    return member;
  }

  await db.update(members).set(data).where(eq(members.id, id));
  return getMemberById(id);
}
