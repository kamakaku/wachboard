-- Add support for multiple divisions per EDITOR
-- This allows ADMINs to assign EDITORs to specific divisions

-- Step 1: Add new column for division_ids array
ALTER TABLE "public"."memberships"
ADD COLUMN "division_ids" uuid[];

-- Step 2: Migrate existing division_id data to division_ids array
UPDATE "public"."memberships"
SET "division_ids" = ARRAY[division_id]
WHERE division_id IS NOT NULL;

-- Step 3: Keep division_id for backward compatibility but make it optional
-- (We'll use division_ids going forward)

-- Step 4: Update the unique constraint to allow multiple memberships per user/station
-- when they have different roles or division assignments
ALTER TABLE "public"."memberships"
DROP CONSTRAINT IF EXISTS "memberships_user_id_station_id_key";

-- Add a new constraint that allows one ADMIN role per user/station
-- but multiple EDITOR roles with different division assignments
CREATE UNIQUE INDEX "unique_admin_per_user_station"
ON "public"."memberships" (user_id, station_id)
WHERE role = 'ADMIN';

-- Step 5: Update the get_user_division function to return an array
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

-- Step 6: Create a helper function to check if user can edit a specific division
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

-- Step 7: Update RLS policies for shifts to use the new function
DROP POLICY IF EXISTS "Allow editor to update their own division's shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow admin to manage all shifts" ON public.shifts;

CREATE POLICY "Allow editor to create shifts for assigned divisions"
ON public.shifts FOR INSERT
WITH CHECK (
  can_edit_division(station_id, division_id)
);

CREATE POLICY "Allow editor to update shifts for assigned divisions"
ON public.shifts FOR UPDATE
USING (
  can_edit_division(station_id, division_id)
)
WITH CHECK (
  can_edit_division(station_id, division_id)
);

CREATE POLICY "Allow admin to delete shifts"
ON public.shifts FOR DELETE
USING (
  get_user_role(station_id) = 'ADMIN'
);

-- Step 8: Update assignments policies
DROP POLICY IF EXISTS "Allow editors/admins to manage assignments in their division" ON public.assignments;

CREATE POLICY "Allow editors/admins to insert assignments"
ON public.assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

CREATE POLICY "Allow editors/admins to update assignments"
ON public.assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

CREATE POLICY "Allow editors/admins to delete assignments"
ON public.assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

-- Step 9: Update shift_notes policies
DROP POLICY IF EXISTS "Allow editors/admins to manage notes in their division" ON public.shift_notes;

CREATE POLICY "Allow editors/admins to insert shift notes"
ON public.shift_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

CREATE POLICY "Allow editors/admins to update shift notes"
ON public.shift_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

CREATE POLICY "Allow editors/admins to delete shift notes"
ON public.shift_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shifts
    WHERE id = shift_id
    AND can_edit_division(shifts.station_id, shifts.division_id)
  )
);

-- Step 10: Add comment explaining the new structure
COMMENT ON COLUMN "public"."memberships"."division_ids" IS 'Array of division IDs that an EDITOR can manage. NULL or empty for ADMIN (can manage all). Ignored for VIEWER.';
