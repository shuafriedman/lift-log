-- Finishing a session used to write one bare Progress row per logged exercise,
-- so a five-exercise session showed up as five identical entries. The previous
-- migration marked those rows so the UI could skip them; they carry nothing the
-- session itself doesn't already record (exercise, sets, reps, weight), so they
-- go for good here rather than sitting in the table forever.
DELETE FROM "Progress" WHERE "source" = 'session';

-- With the legacy rows gone every Progress row is hand-logged, and the column
-- has nothing left to distinguish.
ALTER TABLE "Progress" DROP COLUMN "source";
