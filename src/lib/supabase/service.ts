import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Supabase URL or service role key missing");
  }

  return createClient<Database>(url, serviceRole);
}
