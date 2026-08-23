import prisma from "./prisma";

/**
 * Records a workout for today and updates the user's streak.
 * Mirrors the logic in /api/progress: +1 for a consecutive day,
 * reset to 1 after a gap, unchanged if already logged today.
 * Returns the resulting streak count.
 */
export async function bumpStreak(userId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const existingStreak = await prisma.streak.findUnique({ where: { userId } });

  if (!existingStreak) {
    await prisma.streak.create({
      data: { userId, count: 1, lastDate: new Date() },
    });
    return 1;
  }

  let streakCount = 1;
  const lastDate = existingStreak.lastDate
    ? new Date(existingStreak.lastDate)
    : null;

  if (lastDate) {
    const startOfLast = new Date(lastDate);
    startOfLast.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streakCount = existingStreak.count; // already logged today
    } else if (diffDays === 1) {
      streakCount = existingStreak.count + 1;
    } else {
      streakCount = 1; // gap — reset
    }
  }

  await prisma.streak.update({
    where: { userId },
    data: { count: streakCount, lastDate: new Date() },
  });

  return streakCount;
}
