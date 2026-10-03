import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in user, or null. Uses getClaims(): it verifies the JWT signature (via the project's
 * published signing keys, or the Auth server for symmetric keys), unlike getSession(), whose
 * cookie contents must not be trusted on the server.
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = data.claims.email;
  return { id: data.claims.sub, email: typeof email === "string" ? email : null };
});

/** Call first in every page, Server Action and DAL function. Layouts do not check auth. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
