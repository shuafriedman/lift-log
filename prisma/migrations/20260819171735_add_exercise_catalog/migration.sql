-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "catalogId" TEXT;

-- CreateTable
CREATE TABLE "exercise_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "force" TEXT,
    "level" TEXT,
    "mechanic" TEXT,
    "equipment" TEXT,
    "category" TEXT,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "instructions" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_catalog_name_key" ON "exercise_catalog"("name");

-- CreateIndex
CREATE INDEX "exercise_catalog_category_idx" ON "exercise_catalog"("category");

-- CreateIndex
CREATE INDEX "exercise_catalog_equipment_idx" ON "exercise_catalog"("equipment");

-- CreateIndex
CREATE INDEX "exercise_catalog_level_idx" ON "exercise_catalog"("level");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "exercise_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
