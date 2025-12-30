-- Change shifts timestamps from timestamptz to timestamp
-- This allows storing times without timezone conversion

-- Step 1: Add new columns with timestamp type (no timezone)
ALTER TABLE "public"."shifts"
ADD COLUMN "starts_at_new" timestamp,
ADD COLUMN "ends_at_new" timestamp;

-- Step 2: Copy data from old columns to new columns (converting from UTC to local time)
-- This assumes your local timezone - adjust if needed
UPDATE "public"."shifts"
SET
  "starts_at_new" = "starts_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin',
  "ends_at_new" = "ends_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin';

-- Step 3: Drop old columns
ALTER TABLE "public"."shifts"
DROP COLUMN "starts_at",
DROP COLUMN "ends_at";

-- Step 4: Rename new columns to original names
ALTER TABLE "public"."shifts"
RENAME COLUMN "starts_at_new" TO "starts_at";

ALTER TABLE "public"."shifts"
RENAME COLUMN "ends_at_new" TO "ends_at";

-- Step 5: Add NOT NULL constraints
ALTER TABLE "public"."shifts"
ALTER COLUMN "starts_at" SET NOT NULL,
ALTER COLUMN "ends_at" SET NOT NULL;

-- Step 6: Recreate the unique constraint
ALTER TABLE "public"."shifts"
DROP CONSTRAINT IF EXISTS "shifts_division_id_starts_at_key";

ALTER TABLE "public"."shifts"
ADD CONSTRAINT "shifts_division_id_starts_at_key" UNIQUE ("division_id", "starts_at");
