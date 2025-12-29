-- Remove the CHECK constraint on shift_templates.label to allow custom labels
ALTER TABLE "public"."shift_templates"
DROP CONSTRAINT IF EXISTS "shift_templates_label_check";

-- Remove the unique constraint on (station_id, label) and make label a simple text field
ALTER TABLE "public"."shift_templates"
DROP CONSTRAINT IF EXISTS "shift_templates_station_id_label_key";

-- Add a new unique constraint on (station_id, label) to prevent duplicates
-- but now label can be any text value
ALTER TABLE "public"."shift_templates"
ADD CONSTRAINT "shift_templates_station_id_label_key" UNIQUE ("station_id", "label");

COMMENT ON COLUMN "public"."shift_templates"."label" IS 'Custom label for the shift template (e.g., Tagesdienst, Nachtdienst, etc.)';
