-- Add person_type column to people table
ALTER TABLE "public"."people"
ADD COLUMN "person_type" text DEFAULT 'MITARBEITER' CHECK (person_type IN ('MITARBEITER', 'NOTARZT', 'FUEHRUNGSDIENST'));

COMMENT ON COLUMN "public"."people"."person_type" IS 'Type of person: MITARBEITER (regular staff), NOTARZT (emergency doctor), or FUEHRUNGSDIENST (leadership)';

-- Update existing people to have person_type
UPDATE "public"."people" SET "person_type" = 'MITARBEITER' WHERE "person_type" IS NULL;

-- Update seed data examples based on their tags
UPDATE "public"."people" SET "person_type" = 'NOTARZT' WHERE tags @> ARRAY['NA']::text[];
UPDATE "public"."people" SET "person_type" = 'FUEHRUNGSDIENST' WHERE tags @> ARRAY['Fuehrungsdienst']::text[];
