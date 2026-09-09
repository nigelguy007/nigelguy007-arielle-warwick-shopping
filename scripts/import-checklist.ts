/**
 * Idempotent checklist + accommodation import.
 *
 *   pnpm import:checklist                      # local mode -> ./.data/store.json
 *   pnpm import:checklist --user <auth-uid>    # also seed that user's first statuses (Bought?/Packed?/timing)
 *   DATA_MODE=supabase pnpm import:checklist   # needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 *
 * Options: --csv <path> --accommodations <path> --overwrite
 */
import path from "node:path";
import { LocalStore, LOCAL_DEMO_USER_ID } from "../src/lib/store/local";
import { SupabaseStore } from "../src/lib/store/supabase";
import { seedStore } from "../src/lib/store/seed";
import { createAdminSupabase } from "../src/lib/supabase/admin";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const mode = (process.env.DATA_MODE ?? "local").toLowerCase();
  const csvPath = arg("csv") ? path.resolve(arg("csv") as string) : undefined;
  const accommodationsPath = arg("accommodations") ? path.resolve(arg("accommodations") as string) : undefined;
  const overwrite = process.argv.includes("--overwrite");
  let userId = arg("user");

  if (mode === "supabase") {
    const store = new SupabaseStore(createAdminSupabase());
    const result = await seedStore(store, { csvPath, accommodationsPath, userId, overwriteStatuses: overwrite });
    console.log(JSON.stringify({ mode, ...result }, null, 2));
    return;
  }
  const store = new LocalStore(path.resolve(process.cwd(), process.env.LOCAL_DATA_DIR ?? ".data"));
  userId ??= LOCAL_DEMO_USER_ID;
  const result = await seedStore(store, { csvPath, accommodationsPath, userId, overwriteStatuses: overwrite });
  await store.upsertProfile(userId, { firstName: process.env.LOCAL_DEMO_FIRST_NAME ?? "Arielle" });
  console.log(JSON.stringify({ mode, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
