-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN     "catalogId" TEXT;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "exercise_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
