// !!! SECRET-KEY CLIENT. BYPASSES RLS. LOCAL SCRIPTS ONLY. !!!
// Never import this from anything under src/app, src/proxy.ts or the DAL. The secret key must
// never reach Vercel or the browser. This file deliberately does not import "server-only"
// (scripts run under tsx), so the runtime guard below is the safety net.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  if (typeof window !== "undefined" || process.env.NEXT_RUNTIME) {
    throw new Error("createAdminClient is for local scripts only; it must not run inside the app.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
