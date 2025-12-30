-- Add Storage Bucket for station assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('station-assets', 'station-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to station assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload station assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update station assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete station assets" ON storage.objects;

-- Storage Policies for station-assets bucket
CREATE POLICY "Allow public read access to station assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'station-assets');

CREATE POLICY "Allow admins to upload station assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'station-assets'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
    AND station_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow admins to update station assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'station-assets'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
    AND station_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow admins to delete station assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'station-assets'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
    AND station_id::text = (storage.foldername(name))[1]
  )
);

-- Update stations table policies to allow admins to update station settings
DROP POLICY IF EXISTS "Allow admins to update their station" ON public.stations;

CREATE POLICY "Allow admins to update their station"
ON public.stations FOR UPDATE
USING (
  get_user_role(id) = 'ADMIN'
)
WITH CHECK (
  get_user_role(id) = 'ADMIN'
);

-- Update people table policies to allow EDITORs to manage people
DROP POLICY IF EXISTS "Allow admin to manage people" ON public.people;
DROP POLICY IF EXISTS "Allow admin and editor to insert people" ON public.people;
DROP POLICY IF EXISTS "Allow admin and editor to update people" ON public.people;
DROP POLICY IF EXISTS "Allow admin and editor to delete people" ON public.people;

CREATE POLICY "Allow admin and editor to insert people"
ON public.people FOR INSERT
WITH CHECK (
  get_user_role(station_id) IN ('ADMIN', 'EDITOR')
);

CREATE POLICY "Allow admin and editor to update people"
ON public.people FOR UPDATE
USING (
  get_user_role(station_id) IN ('ADMIN', 'EDITOR')
)
WITH CHECK (
  get_user_role(station_id) IN ('ADMIN', 'EDITOR')
);

CREATE POLICY "Allow admin and editor to delete people"
ON public.people FOR DELETE
USING (
  get_user_role(station_id) IN ('ADMIN', 'EDITOR')
);
