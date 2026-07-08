import { eq, desc, sql } from "drizzle-orm";
import { goals, goalContributions, type GoalContribution } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getContributionsByGoal(goalId: number): Promise<GoalContribution[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.goalContributions
      .filter((c) => c.goalId === goalId)
      .sort(
        (a, b) =>
          b.contributionDate.getTime() - a.contributionDate.getTime() ||
          b.createdAt.getTime() - a.createdAt.getTime()
      );
  }

  return await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))
    .orderBy(desc(goalContributions.contributionDate), desc(goalContributions.createdAt));
}

export async function createContribution(data: any): Promise<GoalContribution | undefined> {
  const db = await getDb();
  if (!db) {
    const newContribution = {
      id: memoryStore.goalContributions.length + 1,
      description: null,
      createdAt: new Date(),
      ...data,
    };
    memoryStore.goalContributions.push(newContribution);
    const goal = memoryStore.goals.find((g) => g.id === data.goalId);
    if (goal) {
      goal.currentAmount = (parseFloat(goal.currentAmount) + parseFloat(data.amount)).toFixed(2);
      goal.updatedAt = new Date();
    }
    return newContribution;
  }

  return await db.transaction(async (tx) => {
    const result = await tx.insert(goalContributions).values(data).returning({ id: goalContributions.id });
    const id = result[0].id;

    await tx
      .update(goals)
      .set({ currentAmount: sql`${goals.currentAmount} + ${data.amount}` })
      .where(eq(goals.id, data.goalId));

    const contribution = await tx
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.id, id))
      .limit(1);
    return contribution.length > 0 ? contribution[0] : undefined;
  });
}
