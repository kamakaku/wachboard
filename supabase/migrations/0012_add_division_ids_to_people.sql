-- Add division_ids field to people table
-- This allows assigning people to specific divisions (Wachabteilungen)

-- Step 1: Add new column for division_ids array
ALTER TABLE "public"."people"
ADD COLUMN "division_ids" uuid[];

-- Step 2: Add comment explaining the new field
COMMENT ON COLUMN "public"."people"."division_ids" IS 'Array of division IDs that this person belongs to. NULL or empty means available for all divisions.';

-- Step 3: Create an index for better query performance
CREATE INDEX idx_people_division_ids ON "public"."people" USING GIN (division_ids);
