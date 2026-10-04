"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TABS_COOKIE } from "@/lib/tabs-pref";

/** Sets the category-tabs preference (no personal data) and returns to the same list URL. */
export async function setTabsPreference(formData: FormData) {
  const value = formData.get("value") === "off" ? "off" : "on";
  const next = String(formData.get("next") ?? "/");
  (await cookies()).set(TABS_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  // Only same-site relative paths, never protocol-relative.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
