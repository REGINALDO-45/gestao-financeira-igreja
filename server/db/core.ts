import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;
export let _initialized = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Serverless environments (Vercel) need max:1 to avoid exhausting connections
      const maxConnections = process.env.VERCEL ? 1 : 5;
      const client = postgres(process.env.DATABASE_URL, { max: maxConnections });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Memory Store for offline/dev fallback
export const memoryStore = {
  users: [] as any[],
  churchSettings: [] as any[],
  members: [] as any[],
  entries: [] as any[],
  expenses: [] as any[],
  costCenters: [] as any[],
  receipts: [] as any[],
  recurringExpenses: [] as any[],
  budgetLines: [] as any[],
  goals: [] as any[],
  goalContributions: [] as any[],
};

export function setInitialized(val: boolean) {
  _initialized = val;
}
