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

  console.log(`Seeding ${exercises.length} catalog exercises...`);

  for (const ex of exercises) {
    // Dataset stores images as "Slug/0.jpg"; we vendored them under /public/exercises.
    const images = ex.images.map((img) => `/exercises/${img}`);
    const data = {
      name: ex.name,
      force: ex.force,
      level: ex.level,
      mechanic: ex.mechanic,
      equipment: ex.equipment,
      category: ex.category,
      primaryMuscles: ex.primaryMuscles ?? [],
      secondaryMuscles: ex.secondaryMuscles ?? [],
      instructions: ex.instructions ?? [],
      images,
    };

    await prisma.exerciseCatalog.upsert({
      where: { id: ex.id },
      create: { id: ex.id, ...data },
      update: data,
    });
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
