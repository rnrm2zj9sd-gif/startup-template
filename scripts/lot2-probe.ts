/**
 * Vérifie que les tables lot 2 existent et que l’anon ne lit rien (RLS).
 * Usage : npx tsx scripts/lot2-probe.ts
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local";

loadEnvLocal();

const TABLES = [
  "profiles",
  "goals",
  "user_skill_choices",
  "custom_catalog",
  "missions",
  "mission_validations",
  "skill_progress",
  "xp_ledger",
  "system_log",
  "achievements",
  "user_achievements",
  "subscriptions",
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("MANQUE_ENV");
    process.exit(1);
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      const missing =
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /could not find the table/i.test(error.message) ||
        /does not exist/i.test(error.message);
      console.log(`${table}\t${missing ? "MISSING" : "ERROR"}\t${error.code ?? ""} ${error.message}`);
      continue;
    }
    const rows = data?.length ?? 0;
    console.log(`${table}\tOK\tanon_rows=${rows}`);
  }

  const { error: insertError } = await supabase.from("xp_ledger").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    montant: 10,
    raison: "probe",
    domaine: "mind",
  });
  console.log(
    `xp_ledger_anon_insert\t${insertError ? "REFUSED" : "ALLOWED"}\t${insertError?.message ?? "inserted"}`,
  );
}

void main();
