import "server-only";
import { requireUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

export interface LookupOption {
  id: string;
  name: string;
}

export async function listCategories(): Promise<LookupOption[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return data;
}

export async function listPaymentMethods(): Promise<LookupOption[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("payment_methods").select("id, name").order("name");
  if (error) throw new Error(`Could not load payment methods: ${error.message}`);
  return data;
}
