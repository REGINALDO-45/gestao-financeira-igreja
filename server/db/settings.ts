import { eq } from "drizzle-orm";
import { churchSettings, type ChurchSettings } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getChurchSettings(): Promise<ChurchSettings | undefined> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    if (memoryStore.churchSettings.length === 0) {
      memoryStore.churchSettings.push({
        id: 1,
        churchName: "Igreja Metodista Monte Alegre",
        pastorName: "Pr. Reginaldo Medeiros",
        treasurerName: "Ageovany de Sousa",
        defaultVerse: "Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa. (Malaquias 3:10)",
        logoUrl: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return memoryStore.churchSettings[0];
  }

  const result = await db.select().from(churchSettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertChurchSettings(
  data: Partial<ChurchSettings>
): Promise<ChurchSettings | undefined> {
  const db = await getDb();
  if (!db) {
    const existing = await getChurchSettings();
    if (existing) {
      Object.assign(existing, data, { updatedAt: new Date() });
      return existing;
    }
    return undefined;
  }

  const existing = await getChurchSettings();

  if (existing) {
    await db
      .update(churchSettings)
      .set(data)
      .where(eq(churchSettings.id, existing.id));
    return { ...existing, ...data } as ChurchSettings;
  } else {
    const result = await db
      .insert(churchSettings)
      .values(data as any)
      .returning({ id: churchSettings.id });
    return { id: result[0].id, ...data } as any;
  }
}
