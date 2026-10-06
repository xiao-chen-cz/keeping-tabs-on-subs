"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** RLS-bound browser client, used only to upload capture files into the user's own Storage folder. */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
