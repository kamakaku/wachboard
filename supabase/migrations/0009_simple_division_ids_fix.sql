-- Simple fix: Add division_ids column if it doesn't exist
-- This is a safer version that doesn't require dropping constraints

-- Step 1: Add division_ids column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'memberships'
        AND column_name = 'division_ids'
    ) THEN
        ALTER TABLE "public"."memberships" ADD COLUMN "division_ids" uuid[];
        COMMENT ON COLUMN "public"."memberships"."division_ids" IS 'Array of division IDs that an EDITOR can manage. NULL or empty for ADMIN (can manage all). Ignored for VIEWER.';
    END IF;
END $$;

-- Step 2: Migrate existing division_id data to division_ids array
UPDATE "public"."memberships"
SET "division_ids" = ARRAY[division_id]
WHERE division_id IS NOT NULL AND (division_ids IS NULL OR array_length(division_ids, 1) IS NULL);

-- Step 3: Drop the old unique constraint if it exists
ALTER TABLE "public"."memberships" DROP CONSTRAINT IF EXISTS "memberships_user_id_station_id_key";

-- Step 4: Create new unique index for ADMIN role only
DROP INDEX IF EXISTS "unique_admin_per_user_station";
CREATE UNIQUE INDEX IF NOT EXISTS "unique_admin_per_user_station"
ON "public"."memberships" (user_id, station_id)
WHERE role = 'ADMIN';

-- Step 5: Update get_user_divisions function
CREATE OR REPLACE FUNCTION get_user_divisions(station_id_input uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT division_ids FROM memberships
    WHERE user_id = auth.uid() AND station_id = station_id_input
    LIMIT 1
  );
END;
$$;

-- Step 6: Create helper function to check if user can edit a specific division
CREATE OR REPLACE FUNCTION can_edit_division(station_id_input uuid, division_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_divisions uuid[];
BEGIN
  SELECT role, division_ids INTO user_role, user_divisions
  FROM memberships
  WHERE user_id = auth.uid() AND station_id = station_id_input
  LIMIT 1;

  -- ADMIN can edit all divisions
  IF user_role = 'ADMIN' THEN
    RETURN true;
  END IF;

  -- EDITOR can only edit assigned divisions
  IF user_role = 'EDITOR' AND division_id_input = ANY(user_divisions) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
