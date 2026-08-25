-- Progress is the user's hand-logged body metrics. Finishing a session used to
-- also spray one row per logged exercise into this table, which is why a single
-- five-exercise session rendered as five identical entries. Sessions are now the
-- record of what was lifted; those legacy rows are marked so the UI can skip them
-- instead of deleting data.
-- AlterTable
ALTER TABLE "Progress" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- Auto-created rows are the only ones with neither a workout nor calories: the
-- log-progress dialog has always required a workout.
UPDATE "Progress"
SET "source" = 'session'
WHERE "workoutId" IS NULL AND "caloriesBurned" IS NULL;
