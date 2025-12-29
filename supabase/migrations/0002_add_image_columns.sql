-- Add image_url column to vehicle_configs if it doesn't exist
alter table public.vehicle_configs
add column if not exists "image_url" text;

-- Add photo_url column to people if it doesn't exist
alter table public.people
add column if not exists "photo_url" text;
