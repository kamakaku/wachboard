-- Initial Schema for Wachboard

-- ==== Extensions ====
-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto" with schema "public";

-- ==== Tables ====

-- Organizations Table
-- Represents a top-level organization (e.g., a city's fire department).
create table "public"."organizations" (
    "id" uuid primary key default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamptz not null default now()
);
comment on table "public"."organizations" is 'Top-level organizations (e.g., a city fire department).';

-- Stations Table
-- Represents a single fire station belonging to an organization.
create table "public"."stations" (
    "id" uuid primary key default gen_random_uuid(),
    "org_id" uuid not null references "public"."organizations"(id) on delete cascade,
    "name" text not null,
    "crest_url" text, -- URL for the station's crest/logo
    "created_at" timestamptz not null default now()
);
comment on table "public"."stations" is 'Individual fire stations or locations.';

-- Divisions Table
-- Represents a shift group or tour within a station (e.g., A-Dienst).
create table "public"."divisions" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "name" text not null,
    "color" text, -- Optional color for UI identification
    "created_at" timestamptz not null default now()
);
comment on table "public"."divisions" is 'Shift groups or tours within a station (e.g., A-Dienst).';

-- User Profiles Table
-- Stores public user information. Joins with auth.users.
create table "public"."users_profile" (
    "id" uuid primary key references "auth"."users"(id) on delete cascade,
    "email" text,
    "name" text,
    "created_at" timestamptz not null default now()
);
comment on table "public"."users_profile" is 'Public profile information for users.';

-- Memberships Table
-- Links users to stations and divisions with a specific role.
create table "public"."memberships" (
    "id" uuid primary key default gen_random_uuid(),
    "user_id" uuid not null references "public"."users_profile"(id) on delete cascade,
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "division_id" uuid references "public"."divisions"(id) on delete set null, -- Nullable for station-wide roles like ADMIN
    "role" text not null check (role in ('ADMIN', 'EDITOR', 'VIEWER')),
    "created_at" timestamptz not null default now(),
    unique ("user_id", "station_id") -- A user can only have one role per station
);
comment on table "public"."memberships" is 'Assigns users roles within stations and optionally divisions.';

-- Join Requests Table
-- Stores requests from users to join a station.
create table "public"."join_requests" (
    "id" uuid primary key default gen_random_uuid(),
    "user_id" uuid not null references "public"."users_profile"(id) on delete cascade,
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "status" text not null check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
    "created_at" timestamptz not null default now(),
    unique ("user_id", "station_id") -- A user can only have one pending request per station
);
comment on table "public"."join_requests" is 'Stores requests from users to join a station.';


-- People Table
-- Stores the list of personnel available for assignment at a station.
create table "public"."people" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "name" text not null,
    "photo_url" text,
    "rank" text,
    "tags" text[], -- For qualifications like 'GF', 'MA', 'NA'
    "active" boolean not null default true,
    "created_at" timestamptz not null default now()
);
comment on table "public"."people" is 'List of personnel available for assignment.';

-- Shift Templates Table
-- Defines standard shift times (e.g., Day, Night).
create table "public"."shift_templates" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "label" text not null check (label in ('DAY', 'NIGHT')),
    "start_time" time not null,
    "end_time" time not null,
    unique("station_id", "label")
);
comment on table "public"."shift_templates" is 'Defines standard shift schedules like DAY and NIGHT.';

-- Schedule Cycles Table
-- Defines the rotation of divisions.
create table "public"."schedule_cycles" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade unique,
    "start_date" date not null,
    "order_division_ids" uuid[] not null,
    "switch_hours" integer not null default 12
);
comment on table "public"."schedule_cycles" is 'Defines the rotation cycle of divisions for a station.';

-- Shifts Table
-- Represents a single, concrete shift instance.
create table "public"."shifts" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "division_id" uuid not null references "public"."divisions"(id) on delete cascade,
    "starts_at" timestamptz not null,
    "ends_at" timestamptz not null,
    "label" text not null check (label in ('DAY', 'NIGHT')),
    "status" text, -- e.g., 'DRAFT', 'PUBLISHED'
    "created_at" timestamptz not null default now(),
    unique ("division_id", "starts_at")
);
comment on table "public"."shifts" is 'A concrete instance of a shift for a specific division and time.';

-- Vehicle Configurations Table
-- Stores the configurable structure of vehicles and their slots.
create table "public"."vehicle_configs" (
    "id" uuid primary key default gen_random_uuid(),
    "station_id" uuid not null references "public"."stations"(id) on delete cascade,
    "key" text not null,
    "title" text not null,
    "order" integer not null default 0,
    "config" jsonb not null, -- JSON object defining truups and slots
    unique("station_id", "key")
);
comment on table "public"."vehicle_configs" is 'Defines the structure of vehicles and their assignable slots.';


-- Assignments Table
-- The core table linking people to vehicle slots for a specific shift.
create table "public"."assignments" (
    "id" uuid primary key default gen_random_uuid(),
    "shift_id" uuid not null references "public"."shifts"(id) on delete cascade,
    "vehicle_key" text not null,
    "slot_key" text not null,
    "person_id" uuid references "public"."people"(id) on delete set null,
    "placeholder_text" text,
    "from_trupp_key" text, -- If the slot is filled by a whole trupp
    "updated_at" timestamptz not null default now(),
    "updated_by" uuid references "public"."users_profile"(id) on delete set null,
    unique("shift_id", "vehicle_key", "slot_key")
);
comment on table "public"."assignments" is 'Links personnel to vehicle slots for a given shift.';

-- Shift Notes Table
-- Stores meta-information for a specific shift.
create table "public"."shift_notes" (
    "shift_id" uuid primary key references "public"."shifts"(id) on delete cascade,
    "meister_text" text,
    "wachleitung_im_haus" boolean not null default false,
    "updated_at" timestamptz not null default now(),
    "updated_by" uuid references "public"."users_profile"(id) on delete set null
);
comment on table "public"."shift_notes" is 'Meta-information for a shift, like duty master.';


-- ==== Functions for RLS ====

-- Get user's role for a specific station
create or replace function get_user_role(station_id_input uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select role from memberships
    where user_id = auth.uid() and station_id = station_id_input
  );
end;
$$;

-- Get user's division for a specific station
create or replace function get_user_division(station_id_input uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select division_id from memberships
    where user_id = auth.uid() and station_id = station_id_input
  );
end;
$$;


-- ==== RLS Policies ====
alter table organizations enable row level security;
alter table stations enable row level security;
alter table divisions enable row level security;
alter table users_profile enable row level security;
alter table memberships enable row level security;
alter table join_requests enable row level security;
alter table people enable row level security;
alter table shift_templates enable row level security;
alter table schedule_cycles enable row level security;
alter table shifts enable row level security;
alter table vehicle_configs enable row level security;
alter table assignments enable row level security;
alter table shift_notes enable row level security;


-- Policies for `organizations`
create policy "Allow public read access" on organizations for select using (true);
create policy "Allow authenticated users to create organizations" on organizations for insert with check (auth.uid() IS NOT NULL);

-- Policies for `stations`
create policy "Allow read access for members" on stations for select using (
  get_user_role(id) IS NOT NULL
);
create policy "Allow public read access to all stations" on stations for select using (true);
create policy "Allow authenticated users to create stations" on stations for insert with check (auth.uid() IS NOT NULL);

-- Policies for `divisions`
create policy "Allow read access for station members" on divisions for select using (
  get_user_role(station_id) is not null
);

-- Policies for `users_profile`
create policy "Allow users to read their own profile" on users_profile for select using (auth.uid() = id);
create policy "Allow station admins to see member profiles" on users_profile for select using (
    get_user_role( (select station_id from memberships where user_id = id limit 1) ) = 'ADMIN'
);

-- Policies for `memberships`
create policy "Allow station admins to manage memberships" on memberships for all using (
  get_user_role(station_id) = 'ADMIN'
);
create policy "Allow users to see their own memberships" on memberships for select using (
  user_id = auth.uid()
);
create policy "Allow users to create their own membership when joining" on memberships for insert with check (
  user_id = auth.uid()
);

-- Policies for `join_requests`
create policy "Allow users to create their own join requests" on join_requests for insert with check (
  user_id = auth.uid()
);
create policy "Allow users to see their own join requests" on join_requests for select using (
  user_id = auth.uid()
);
create policy "Allow station admins to see join requests for their station" on join_requests for select using (
  get_user_role(station_id) = 'ADMIN'
);
create policy "Allow station admins to update join requests for their station" on join_requests for update using (
  get_user_role(station_id) = 'ADMIN'
);

-- Policies for `people`
create policy "Allow read access for station members" on people for select using (
  get_user_role(station_id) is not null
);
create policy "Allow admin to manage people" on people for all using (
  get_user_role(station_id) = 'ADMIN'
);

-- Policies for `shift_templates`, `schedule_cycles`, `vehicle_configs` (Admin-only management)
create policy "Allow read access for station members" on shift_templates for select using (get_user_role(station_id) is not null);
create policy "Allow admin to manage" on shift_templates for all using (get_user_role(station_id) = 'ADMIN');

create policy "Allow read access for station members" on schedule_cycles for select using (get_user_role(station_id) is not null);
create policy "Allow admin to manage" on schedule_cycles for all using (get_user_role(station_id) = 'ADMIN');

create policy "Allow read access for station members" on vehicle_configs for select using (get_user_role(station_id) is not null);
create policy "Allow admin to manage" on vehicle_configs for all using (get_user_role(station_id) = 'ADMIN');


-- Policies for `shifts`
create policy "Allow read access for station members" on shifts for select using (
  get_user_role(station_id) is not null
);
create policy "Allow editor to update their own division's shifts" on shifts for update using (
  get_user_role(station_id) in ('ADMIN', 'EDITOR') and division_id = get_user_division(station_id)
);
create policy "Allow admin to manage all shifts" on shifts for all using (
  get_user_role(station_id) = 'ADMIN'
);

-- Policies for `assignments`
create policy "Allow read access via shifts" on assignments for select using (
  exists (select 1 from shifts where id = shift_id) -- users can see assignments if they can see the shift
);
create policy "Allow editors/admins to manage assignments in their division" on assignments for all using (
  exists (
    select 1 from shifts
    where id = shift_id
    and get_user_role(shifts.station_id) in ('ADMIN', 'EDITOR')
    and (
      get_user_role(shifts.station_id) = 'ADMIN'
      or
      (get_user_role(shifts.station_id) = 'EDITOR' and shifts.division_id = get_user_division(shifts.station_id))
    )
  )
);

-- Policies for `shift_notes`
create policy "Allow read access via shifts" on shift_notes for select using (
  exists (select 1 from shifts where id = shift_id)
);
create policy "Allow editors/admins to manage notes in their division" on shift_notes for all using (
  exists (
    select 1 from shifts
    where id = shift_id
    and get_user_role(shifts.station_id) in ('ADMIN', 'EDITOR')
    and (
      get_user_role(shifts.station_id) = 'ADMIN'
      or
      (get_user_role(shifts.station_id) = 'EDITOR' and shifts.division_id = get_user_division(shifts.station_id))
    )
  )
);


-- ==== Triggers ====

-- Function to set updated_at timestamp
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for assignments
create trigger handle_updated_at before update on assignments
for each row execute procedure set_updated_at();

-- Trigger for shift_notes
create trigger handle_updated_at before update on shift_notes
for each row execute procedure set_updated_at();

-- Function to create a user profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users_profile (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==== Realtime Publications ====
-- Supabase projects now have this publication by default.
-- create publication supabase_realtime for all tables;


-- ==== Seed Data ====

-- 1. Organization
insert into "public"."organizations" (id, name)
values ('10000000-0000-0000-0000-000000000001', 'Feuerwehr');

-- 2. Station
insert into "public"."stations" (id, org_id, name)
values ('22000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Wache 22');

-- 3. Divisions
insert into "public"."divisions" (id, station_id, name, color) values
('2200000A-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'A-Dienst', '#FF0000'),
('2200000B-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'B-Dienst', '#00FF00'),
('2200000C-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'C-Dienst', '#0000FF'),
('2200000D-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'D-Dienst', '#FFFF00');

-- 4. Admin User & Memberships (Handled by UI)

-- 5. People
insert into "public"."people" (station_id, name, rank, tags) values
('22000000-0000-0000-0000-000000000001', 'Mustermann, Max', 'HBM', '{"GF", "MA"}'),
('22000000-0000-0000-0000-000000000001', 'Feuer, Frida', 'OBM', '{"GF", "MA", "AT"}'),
('22000000-0000-0000-0000-000000000001', 'Brand, Bernd', 'BM', '{"MA", "WT"}'),
('22000000-0000-0000-0000-000000000001', 'Lösch, Laura', 'BM', '{"MA", "AT"}'),
('22000000-0000-0000-0000-000000000001', 'Sirene, Susi', 'BA', '{"MA"}'),
('22000000-0000-0000-0000-000000000001', 'Martinshorn, Mike', 'BI', '{"MA"}'),
('22000000-0000-0000-0000-000000000001', 'Doctor, Eva', 'NA', '{"NA"}'),
('22000000-0000-0000-0000-000000000001', 'Leitner, Leo', 'BAR', '{"Fuehrungsdienst"}');

-- 6. Shift Templates
insert into "public"."shift_templates" (station_id, label, start_time, end_time) values
('22000000-0000-0000-0000-000000000001', 'DAY', '07:00:00', '19:00:00'),
('22000000-0000-0000-0000-000000000001', 'NIGHT', '19:00:00', '07:00:00');

-- 7. Schedule Cycle
insert into "public"."schedule_cycles" (station_id, start_date, order_division_ids, switch_hours) values
('22000000-0000-0000-0000-000000000001', current_date, '{2200000A-0000-0000-0000-000000000001, 2200000B-0000-0000-0000-000000000001, 2200000C-0000-0000-0000-000000000001, 2200000D-0000-0000-0000-000000000001}', 12);

-- 8. Vehicle Configs
insert into "public"."vehicle_configs" (station_id, "key", title, "order", config) values
('22000000-0000-0000-0000-000000000001', 'LHF', 'LHF', 1, '{"trupps": [{"key": "Trupp37", "label": "Staffel", "slots": ["Maschinist", "Stff."]}, {"key": "Trupp52", "label": "A-Trupp", "slots": ["A-Trupp", "Praktikant A-Trupp"]}, {"key": "Trupp55", "label": "W-Trupp", "slots": ["W-Trupp", "Praktikant W-Trupp"]}]}'),
('22000000-0000-0000-0000-000000000001', 'DLK', 'DLK', 2, '{"slots": ["Maschinist", "Korb"]}'),
('22000000-0000-0000-0000-000000000001', 'RTW-X', 'RTW X (22/6)', 3, '{"slots": ["MVE", "MA"]}'),
('22000000-0000-0000-0000-000000000001', 'RTB', 'RTB', 4, '{"slots": ["Boot-1", "Boot-2"]}'),
('22000000-0000-0000-0000-000000000001', 'CBRN', 'CBRN-Erk.', 5, '{"slots": ["Fahrer", "Mess-Trupp"]}'),
('22000000-0000-0000-0000-000000000001', 'RTW-1', 'RTW 22/1', 6, '{"slots": ["MVE", "MA", "Praktikant"]}'),
('22000000-0000-0000-0000-000000000001', 'RTW-2', 'RTW 22/2', 7, '{"slots": ["MVE", "MA", "Praktikant"]}'),
('22000000-0000-0000-0000-000000000001', 'NEF', 'NEF', 8, '{"slots": ["Notarzt", "MA", "Praktikant 1", "Praktikant 2"]}'),
('22000000-0000-0000-0000-000000000001', 'KLEF', 'KLEF', 9, '{"slots": ["Fahrer", "Beifahrer"]}'),
('22000000-0000-0000-0000-000000000001', 'ELW', 'ELW C-2217', 10, '{"slots": ["Fahrer", "Führer", "Praktikant"]}');

-- Grant usage to the schema and permissions to the tables for the API roles
grant usage on schema public to postgres, anon, authenticated;
grant all on all tables in schema public to postgres, anon, authenticated;
grant all on all functions in schema public to postgres, anon, authenticated;
grant all on all sequences in schema public to postgres, anon, authenticated;


