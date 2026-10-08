"use server";
import { markTourDone } from "@/lib/dal/profile";

export async function markTourDoneAction(): Promise<void> {
  await markTourDone();
}
