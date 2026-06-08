import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  members,
  entries,
  expenses,
  costCenters,
  churchSettings,
  receipts,
  type Member,
  type Entry,
  type Expense,
  type CostCenter,
  type ChurchSettings,
  type Receipt,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _initialized = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Memory Store for offline/dev fallback
const memoryStore = {
  users: [] as any[],
  churchSettings: [] as any[],
  members: [] as any[],
  entries: [] as any[],
  expenses: [] as any[],
  costCenters: [] as any[],
  receipts: [] as any[],
};

export async function ensureInitialized() {
  const db = await getDb();
  if (!db && !_initialized) {
    _initialized = true;
    console.log("[Database] Database URL is empty. Automatically initializing mock data in memory...");
    await seedDemoData();
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available. Falling back to memory.");
    const existing = memoryStore.users.find(u => u.openId === user.openId);
    if (existing) {
      Object.assign(existing, user, { updatedAt: new Date() });
    } else {
      memoryStore.users.push({
        id: memoryStore.users.length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        role: user.openId === ENV.ownerOpenId ? "admin" : "visualizador",
        ...user
      });
    }
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return memoryStore.users.find(u => u.openId === openId);
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Church Settings
export async function getChurchSettings(): Promise<ChurchSettings | undefined> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    if (memoryStore.churchSettings.length === 0) {
      memoryStore.churchSettings.push({
        id: 1,
        churchName: "Igreja Metodista Monte Alegre",
        pastorName: "Rev. Marcos Aurélio de Souza",
        treasurerName: "Reginaldo Medeiros Silva",
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
    const result = await db.insert(churchSettings).values(data as any);
    return { id: result[0].insertId, ...data } as any;
  }
}

// Members
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

  const result = await db.insert(members).values(data);
  return getMemberById(result[0].insertId as number);
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

// Entries
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

  const result = await db.insert(entries).values(data);
  const id = result[0].insertId as number;
  const entry = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);
  return entry.length > 0 ? entry[0] : undefined;
}

// Expenses
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

  const result = await db.insert(expenses).values(data);
  const id = result[0].insertId as number;
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

// Cost Centers
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

  const result = await db.insert(costCenters).values(data);
  const id = result[0].insertId as number;
  const cc = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, id))
    .limit(1);
  return cc.length > 0 ? cc[0] : undefined;
}

// Receipts
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

  const result = await db.insert(receipts).values(data);
  const id = result[0].insertId as number;
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

export async function seedDemoData(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    // Seeding in memory fallback!
    memoryStore.receipts = [];
    memoryStore.entries = [];
    memoryStore.expenses = [];
    memoryStore.costCenters = [];
    memoryStore.members = [];
    memoryStore.churchSettings = [];

    // Configurações
    memoryStore.churchSettings.push({
      id: 1,
      churchName: "Igreja Metodista Monte Alegre",
      pastorName: "Rev. Marcos Aurélio de Souza",
      treasurerName: "Reginaldo Medeiros Silva",
      defaultVerse: "Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa. (Malaquias 3:10)",
      logoUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Centros de Custo
    const targetCCs = ["Administrativo", "Ação Social", "Missões", "Construção", "Escola Dominical"];
    for (const name of targetCCs) {
      memoryStore.costCenters.push({
        id: memoryStore.costCenters.length + 1,
        name,
        description: `Centro de custo para atividades de ${name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Membros
    const membersData = [
      { name: "Ana Maria de Souza", email: "ana.souza@email.com", phone: "(11) 98765-4321", status: "regular" as const, isActiveTithePayer: true },
      { name: "João Pedro de Oliveira", email: "joao.pedro@email.com", phone: "(11) 97654-3210", status: "regular" as const, isActiveTithePayer: true },
      { name: "Maria Clara Santos", email: "clara.santos@email.com", phone: "(11) 96543-2109", status: "atrasado" as const, isActiveTithePayer: false },
      { name: "Carlos Henrique Lima", email: "carlos.lima@email.com", phone: "(11) 95432-1098", status: "regular" as const, isActiveTithePayer: true },
      { name: "Fernanda Rodrigues da Silva", email: "fernanda.silva@email.com", phone: "(11) 94321-0987", status: "inativo" as const, isActiveTithePayer: false },
      { name: "Roberto Alves Costa", email: "roberto.costa@email.com", phone: "(11) 93210-9876", status: "regular" as const, isActiveTithePayer: true },
    ];

    for (const m of membersData) {
      memoryStore.members.push({
        id: memoryStore.members.length + 1,
        name: m.name,
        email: m.email,
        phone: m.phone,
        status: m.status,
        isActiveTithePayer: m.isActiveTithePayer,
        address: "Av. Principal, 1000 - Centro",
        birthDate: new Date("1985-05-15"),
        baptismDate: new Date("2010-10-12"),
        observations: "Membro ativo.",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Entradas e Recibos
    const paymentMethods = ["pix", "dinheiro", "transferencia"] as const;
    const sundays = [
      "Domingo, 03 de Maio",
      "Domingo, 10 de Maio",
      "Domingo, 17 de Maio",
      "Domingo, 24 de Maio",
      "Domingo, 31 de Maio",
    ];

    const now = new Date();
    let receiptCounter = 1001;

    for (const member of memoryStore.members) {
      if (member.isActiveTithePayer) {
        for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
          const entryDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 10);
          const amount = (200 + Math.random() * 300).toFixed(2);
          
          memoryStore.entries.push({
            id: memoryStore.entries.length + 1,
            memberId: member.id,
            entryDate: entryDate,
            category: "dizimo",
            amount: amount,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            description: `Dízimo de ${member.name} - Ref. ${entryDate.getMonth() + 1}/${entryDate.getFullYear()}`,
            cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          const entryId = memoryStore.entries.length;
          
          memoryStore.receipts.push({
            id: memoryStore.receipts.length + 1,
            entryId: entryId,
            receiptNumber: `REC-${receiptCounter++}`,
            memberId: member.id,
            amount: amount,
            category: "dizimo",
            issuedDate: entryDate,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (Math.random() > 0.3) {
        const entryDate = new Date(now.getFullYear(), now.getMonth(), 17);
        const amount = (20 + Math.random() * 80).toFixed(2);
        
        memoryStore.entries.push({
          id: memoryStore.entries.length + 1,
          memberId: member.id,
          entryDate: entryDate,
          category: "oferta",
          amount: amount,
          paymentMethod: "dinheiro",
          description: `Oferta voluntária de ${member.name}`,
          cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const entryId = memoryStore.entries.length;

        memoryStore.receipts.push({
          id: memoryStore.receipts.length + 1,
          entryId: entryId,
          receiptNumber: `REC-${receiptCounter++}`,
          memberId: member.id,
          amount: amount,
          category: "oferta",
          issuedDate: entryDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Ofertas gerais
    for (const sunday of sundays) {
      for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
        const entryDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 3 + sundays.indexOf(sunday) * 7);
        const amount = (150 + Math.random() * 250).toFixed(2);
        
        memoryStore.entries.push({
          id: memoryStore.entries.length + 1,
          memberId: null,
          entryDate: entryDate,
          category: "oferta",
          amount: amount,
          paymentMethod: "dinheiro",
          description: `Oferta Geral do Culto - ${sunday}`,
          cultoSunday: sunday,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Saídas (Despesas)
    const expenseCategories = [
      { category: "agua" as const, desc: "Conta de água do templo", amount: "120.50", supplier: "Sabesp" },
      { category: "energia" as const, desc: "Conta de energia elétrica", amount: "380.90", supplier: "Enel" },
      { category: "internet" as const, desc: "Plano mensal de internet", amount: "99.90", supplier: "Vivo" },
      { category: "material_limpeza" as const, desc: "Produtos para limpeza", amount: "150.00", supplier: "Supermercado Local" },
      { category: "evangelismo" as const, desc: "Materiais evangelísticos", amount: "250.00", supplier: "Gráfica" },
    ];

    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
      const expenseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      
      for (const ec of expenseCategories) {
        const matchingCC = memoryStore.costCenters.find(c => c.name === "Administrativo" || c.name === "Ação Social");
        const ccId = matchingCC ? matchingCC.id : undefined;

        memoryStore.expenses.push({
          id: memoryStore.expenses.length + 1,
          expenseDate: expenseDate,
          category: ec.category,
          amount: (parseFloat(ec.amount) + (Math.random() * 20 - 10)).toFixed(2),
          paymentMethod: "pix",
          paymentStatus: "pago",
          description: ec.desc,
          supplier: ec.supplier,
          costCenterId: ccId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return true;
  }

  try {
    // 1. Limpar dados anteriores
    await db.delete(receipts);
    await db.delete(entries);
    await db.delete(expenses);
    await db.delete(costCenters);
    await db.delete(members);

    // 2. Configurações da Igreja
    await db.insert(churchSettings).values({
      churchName: "Igreja Metodista Monte Alegre",
      pastorName: "Rev. Marcos Aurélio de Souza",
      treasurerName: "Reginaldo Medeiros Silva",
      defaultVerse: "Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa. (Malaquias 3:10)",
      logoUrl: "",
    }).onDuplicateKeyUpdate({
      set: {
        churchName: "Igreja Metodista Monte Alegre",
        pastorName: "Rev. Marcos Aurélio de Souza",
        treasurerName: "Reginaldo Medeiros Silva",
      }
    });

    // 3. Centros de Custo
    const targetCCs = ["Administrativo", "Ação Social", "Missões", "Construção", "Escola Dominical"];
    for (const name of targetCCs) {
      await db.insert(costCenters).values({
        name,
        description: `Centro de custo para atividades de ${name}`,
      });
    }
    const allCCs = await db.select().from(costCenters);

    // 4. Membros
    const membersData = [
      { name: "Ana Maria de Souza", email: "ana.souza@email.com", phone: "(11) 98765-4321", status: "regular" as const, isActiveTithePayer: true },
      { name: "João Pedro de Oliveira", email: "joao.pedro@email.com", phone: "(11) 97654-3210", status: "regular" as const, isActiveTithePayer: true },
      { name: "Maria Clara Santos", email: "clara.santos@email.com", phone: "(11) 96543-2109", status: "atrasado" as const, isActiveTithePayer: false },
      { name: "Carlos Henrique Lima", email: "carlos.lima@email.com", phone: "(11) 95432-1098", status: "regular" as const, isActiveTithePayer: true },
      { name: "Fernanda Rodrigues da Silva", email: "fernanda.silva@email.com", phone: "(11) 94321-0987", status: "inativo" as const, isActiveTithePayer: false },
      { name: "Roberto Alves Costa", email: "roberto.costa@email.com", phone: "(11) 93210-9876", status: "regular" as const, isActiveTithePayer: true },
    ];

    for (const m of membersData) {
      await db.insert(members).values({
        name: m.name,
        email: m.email,
        phone: m.phone,
        status: m.status,
        isActiveTithePayer: m.isActiveTithePayer,
        address: "Av. Principal, 1000 - Centro",
        birthDate: new Date("1985-05-15"),
        baptismDate: new Date("2010-10-12"),
        observations: "Membro ativo.",
      });
    }
    const allMembers = await db.select().from(members);

    // 5. Entradas e Recibos
    const paymentMethods = ["pix", "dinheiro", "transferencia"] as const;
    const sundays = [
      "Domingo, 03 de Maio",
      "Domingo, 10 de Maio",
      "Domingo, 17 de Maio",
      "Domingo, 24 de Maio",
      "Domingo, 31 de Maio",
    ];

    const now = new Date();
    let receiptCounter = 1001;

    for (const member of allMembers) {
      // Dízimos nos últimos 2 meses
      if (member.isActiveTithePayer) {
        for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
          const entryDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 10);
          const amount = (200 + Math.random() * 300).toFixed(2);
          
          const result = await db.insert(entries).values({
            memberId: member.id,
            entryDate: entryDate,
            category: "dizimo",
            amount: amount,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            description: `Dízimo de ${member.name} - Ref. ${entryDate.getMonth() + 1}/${entryDate.getFullYear()}`,
            cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
          });
          
          const entryId = result[0].insertId as number;
          
          await db.insert(receipts).values({
            entryId: entryId,
            receiptNumber: `REC-${receiptCounter++}`,
            memberId: member.id,
            amount: amount,
            category: "dizimo",
            issuedDate: entryDate,
          });
        }
      }

      // Ofertas extras
      if (Math.random() > 0.3) {
        const entryDate = new Date(now.getFullYear(), now.getMonth(), 17);
        const amount = (20 + Math.random() * 80).toFixed(2);
        
        const result = await db.insert(entries).values({
          memberId: member.id,
          entryDate: entryDate,
          category: "oferta",
          amount: amount,
          paymentMethod: "dinheiro",
          description: `Oferta voluntária de ${member.name}`,
          cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
        });

        const entryId = result[0].insertId as number;

        await db.insert(receipts).values({
          entryId: entryId,
          receiptNumber: `REC-${receiptCounter++}`,
          memberId: member.id,
          amount: amount,
          category: "oferta",
          issuedDate: entryDate,
        });
      }
    }

    // Ofertas gerais do culto
    for (const sunday of sundays) {
      for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
        const entryDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 3 + sundays.indexOf(sunday) * 7);
        const amount = (150 + Math.random() * 250).toFixed(2);
        
        await db.insert(entries).values({
          memberId: null,
          entryDate: entryDate,
          category: "oferta",
          amount: amount,
          paymentMethod: "dinheiro",
          description: `Oferta Geral do Culto - ${sunday}`,
          cultoSunday: sunday,
        });
      }
    }

    // 6. Saídas (Despesas)
    const expenseCategories = [
      { category: "agua" as const, desc: "Conta de água do templo", amount: "120.50", supplier: "Sabesp" },
      { category: "energia" as const, desc: "Conta de energia elétrica", amount: "380.90", supplier: "Enel" },
      { category: "internet" as const, desc: "Plano mensal de internet", amount: "99.90", supplier: "Vivo" },
      { category: "material_limpeza" as const, desc: "Produtos para limpeza", amount: "150.00", supplier: "Supermercado Local" },
      { category: "evangelismo" as const, desc: "Materiais evangelísticos", amount: "250.00", supplier: "Gráfica" },
    ];

    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
      const expenseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      
      for (const ec of expenseCategories) {
        const matchingCC = allCCs.find(c => c.name === "Administrativo" || c.name === "Ação Social");
        const ccId = matchingCC ? matchingCC.id : undefined;

        await db.insert(expenses).values({
          expenseDate: expenseDate,
          category: ec.category,
          amount: (parseFloat(ec.amount) + (Math.random() * 20 - 10)).toFixed(2),
          paymentMethod: "pix",
          paymentStatus: "pago",
          description: ec.desc,
          supplier: ec.supplier,
          costCenterId: ccId,
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao rodar seed:", error);
    return false;
  }
}
