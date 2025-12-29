-- Add vehicle image_url column
alter table public.vehicle_configs
add column if not exists "image_url" text;
