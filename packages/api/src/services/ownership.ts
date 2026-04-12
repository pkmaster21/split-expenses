import { db, members, activityLog } from '../db/index.js';
import { eq, isNull, and, asc } from 'drizzle-orm';

export async function ensureOwnerExists(groupId: string): Promise<void> {
  const [owner] = await db
    .select()
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.role, 'owner'), isNull(members.leftAt)))
    .limit(1);

  if (owner) return;

  const [oldest] = await db
    .select()
    .from(members)
    .where(and(eq(members.groupId, groupId), isNull(members.leftAt)))
    .orderBy(asc(members.joinedAt))
    .limit(1);

  if (oldest) {
    await db.update(members).set({ role: 'owner' }).where(eq(members.id, oldest.id));
    await db.insert(activityLog).values({
      groupId,
      message: `${oldest.displayName} is now the group owner`,
    });
  }
}
