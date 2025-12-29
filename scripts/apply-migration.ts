import { createServiceClient } from "@/lib/supabase/service";
import fs from "fs";
import path from "path";

async function applyMigration() {
  const supabase = createServiceClient();

  // Read the migration file
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/0002_add_image_columns.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log("Applying migration...");
  console.log(sql);

  // Execute the SQL
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  console.log("Migration applied successfully!");
  process.exit(0);
}

applyMigration();
