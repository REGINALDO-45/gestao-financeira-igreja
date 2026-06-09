import { eq } from "drizzle-orm";
import { getDb, memoryStore, _initialized, setInitialized } from "./core";
import { churchSettings, costCenters, members, entries, expenses, receipts } from "../../drizzle/schema";

export async function ensureInitialized() {
  const db = await getDb();
  if (!db && !_initialized) {
    setInitialized(true);
    console.log("[Database] Database URL is empty. Automatically initializing mock data in memory...");
    await seedDemoData();
  }
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
    const existingSettings = await db.select().from(churchSettings).limit(1);
    if (existingSettings.length > 0) {
      await db
        .update(churchSettings)
        .set({
          churchName: "Igreja Metodista Monte Alegre",
          pastorName: "Rev. Marcos Aurélio de Souza",
          treasurerName: "Reginaldo Medeiros Silva",
        })
        .where(eq(churchSettings.id, existingSettings[0].id));
    } else {
      await db.insert(churchSettings).values({
        churchName: "Igreja Metodista Monte Alegre",
        pastorName: "Rev. Marcos Aurélio de Souza",
        treasurerName: "Reginaldo Medeiros Silva",
        defaultVerse: "Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa. (Malaquias 3:10)",
        logoUrl: "",
      });
    }

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
      if (member.isActiveTithePayer) {
        for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
          const entryDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 10);
          const amount = (200 + Math.random() * 300).toFixed(2);
          
          const result = await db
            .insert(entries)
            .values({
              memberId: member.id,
              entryDate: entryDate,
              category: "dizimo",
              amount: amount,
              paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
              description: `Dízimo de ${member.name} - Ref. ${entryDate.getMonth() + 1}/${entryDate.getFullYear()}`,
              cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
            })
            .returning({ id: entries.id });

          const entryId = result[0].id;
          
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

      if (Math.random() > 0.3) {
        const entryDate = new Date(now.getFullYear(), now.getMonth(), 17);
        const amount = (20 + Math.random() * 80).toFixed(2);
        
        const result = await db
          .insert(entries)
          .values({
            memberId: member.id,
            entryDate: entryDate,
            category: "oferta",
            amount: amount,
            paymentMethod: "dinheiro",
            description: `Oferta voluntária de ${member.name}`,
            cultoSunday: sundays[Math.floor(Math.random() * sundays.length)],
          })
          .returning({ id: entries.id });

        const entryId = result[0].id;

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
