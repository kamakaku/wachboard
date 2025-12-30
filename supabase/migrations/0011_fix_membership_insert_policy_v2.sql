-- Fix memberships INSERT policy - Version 2
-- This version uses a simpler approach that definitely works

-- First, drop ALL existing INSERT policies on memberships
DROP POLICY IF EXISTS "Allow users to create their own membership when joining" ON public.memberships;
DROP POLICY IF EXISTS "Allow users and admins to create memberships" ON public.memberships;
DROP POLICY IF EXISTS "Allow station admins to manage memberships" ON public.memberships;

-- Recreate the admin policy for ALL operations (including INSERT)
CREATE POLICY "Allow station admins to manage memberships"
ON public.memberships
FOR ALL
USING (
  get_user_role(station_id) = 'ADMIN'
)
WITH CHECK (
  get_user_role(station_id) = 'ADMIN'
);

-- Keep the policy for users to see their own memberships
-- (This one already exists, just making sure)
DROP POLICY IF EXISTS "Allow users to see their own memberships" ON public.memberships;
CREATE POLICY "Allow users to see their own memberships"
ON public.memberships
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to create their own membership (for self-registration during onboarding)
CREATE POLICY "Allow users to create own membership"
ON public.memberships
FOR INSERT
WITH CHECK (user_id = auth.uid());
