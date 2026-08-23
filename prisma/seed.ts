import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

async function main() {
  const file = join(__dirname, "seed-data", "exercises.json");
  const exercises = JSON.parse(readFileSync(file, "utf8")) as RawExercise[];

  // This runs on every deploy, so bail out cheaply once the catalog matches the
  // dataset. Set FORCE_SEED=1 to re-write the rows anyway.
  const existing = await prisma.exerciseCatalog.count();
  if (existing === exercises.length && !process.env.FORCE_SEED) {
    console.log(`Catalog already has ${existing} exercises — skipping seed.`);
    return;
  }

  // Dataset stores images as "Slug/0.jpg"; we vendored them under /public/exercises.
  const rows = exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    force: ex.force,
    level: ex.level,
    mechanic: ex.mechanic,
    equipment: ex.equipment,
    category: ex.category,
    primaryMuscles: ex.primaryMuscles ?? [],
    secondaryMuscles: ex.secondaryMuscles ?? [],
    instructions: ex.instructions ?? [],
    images: ex.images.map((img) => `/exercises/${img}`),
  }));

  console.log(`Seeding ${rows.length} catalog exercises (have ${existing})...`);

  if (existing === 0) {
    // Cold database (a fresh deploy target): one bulk insert beats 873 round trips.
    await prisma.exerciseCatalog.createMany({ data: rows, skipDuplicates: true });
  } else {
    for (const { id, ...data } of rows) {
      await prisma.exerciseCatalog.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
  }

  const total = await prisma.exerciseCatalog.count();
  console.log(`Done. Catalog now has ${total} exercises.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
