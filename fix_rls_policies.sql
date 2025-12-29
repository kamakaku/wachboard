-- Fix RLS Policies for Organizations and Stations
-- This allows authenticated users to create new organizations and stations during onboarding

-- Allow authenticated users to create organizations
drop policy if exists "Allow authenticated users to create organizations" on organizations;
create policy "Allow authenticated users to create organizations" on organizations for insert with check (auth.uid() IS NOT NULL);

-- Allow authenticated users to create stations
drop policy if exists "Allow authenticated users to create stations" on stations;
create policy "Allow authenticated users to create stations" on stations for insert with check (auth.uid() IS NOT NULL);

-- Allow admins to manage divisions
drop policy if exists "Allow admins to manage divisions" on divisions;
create policy "Allow admins to manage divisions" on divisions for all using (
  get_user_role(station_id) = 'ADMIN'
);
