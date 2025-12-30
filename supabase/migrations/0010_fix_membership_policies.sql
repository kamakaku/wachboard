-- Fix memberships policies to allow admins to create memberships for other users

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Allow users to create their own membership when joining" ON public.memberships;

-- Create new policy that allows:
-- 1. Users to create their own membership (self-registration)
-- 2. Admins to create memberships for users in their station
CREATE POLICY "Allow users and admins to create memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
  -- User can create their own membership
  user_id = auth.uid()
  OR
  -- Admin can create membership for users in their station
  EXISTS (
    SELECT 1 FROM public.memberships admin_membership
    WHERE admin_membership.user_id = auth.uid()
    AND admin_membership.station_id = memberships.station_id
    AND admin_membership.role = 'ADMIN'
  )
);
