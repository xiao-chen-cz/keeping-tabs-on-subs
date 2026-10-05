// Entry for the send-alerts function's bundle (pnpm bundle:alerts): the app's pure alert code, so the
// daily job and the app follow the same rules. Pure modules only (no server-only, React or Next imports).
export { buildDigest, renderDigestEmail, sentKey } from "@/lib/alerts-job/digest";
export { rowToSubscription } from "@/lib/dal/map-row";
export { todayIn } from "@/lib/dates/plain-date";
