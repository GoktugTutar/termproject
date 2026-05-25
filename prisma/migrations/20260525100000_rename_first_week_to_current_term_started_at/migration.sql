-- Rename firstWeekStartedAt → currentTermStartedAt
-- Existing rows with NULL keep NULL (isFirstWeekDate returns false → no first-week lock)
-- Existing rows with a value keep their value unchanged

ALTER TABLE "User" RENAME COLUMN "firstWeekStartedAt" TO "currentTermStartedAt";
