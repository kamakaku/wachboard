-- Remove the CHECK constraint on shifts.label to allow custom labels
ALTER TABLE "public"."shifts"
DROP CONSTRAINT IF EXISTS "shifts_label_check";

-- Make label nullable and remove the constraint
ALTER TABLE "public"."shifts"
ALTER COLUMN "label" DROP NOT NULL;

COMMENT ON COLUMN "public"."shifts"."label" IS 'Optional label for the shift (e.g., from shift template)';
