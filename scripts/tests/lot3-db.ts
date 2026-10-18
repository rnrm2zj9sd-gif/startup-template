/**
 * Tests base lot 3 — clé anon uniquement, jamais service_role.
 *
 *   npm run test:lot3
 *
 * Variables dans .env.local (jamais dans git) :
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../env-local";
import { calculerXpMission } from "../../lib/progression/xp";
import { snapshotDepuisTables } from "../../lib/progression/snapshot";
import { jourLocal } from "../../lib/temps";

loadEnvLocal();

type Status = "OK" | "ÉCHEC" | "non exécuté";
type Row = { test: string; result: Status; proof: string };

const rows: Row[] = [];
const MARK = `lot3-${Date.now()}`;

function record(test: string, result: Status, proof: string) {
  rows.push({ test, result, proof });
  console.log(`${result}\t${test}\t${proof}`);
}

function requiredEnv() {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "TEST_USER_A_EMAIL",
    "TEST_USER_A_PASSWORD",
    "TEST_USER_B_EMAIL",
    "TEST_USER_B_PASSWORD",
  ] as const;
  return names.filter((name) => !process.env[name]?.trim());
}

function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string) {
  const supabase = anonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(error?.message ?? "session absente");
  }
  return { supabase, user: data.user };
}

async function createMission(
  supabase: SupabaseClient,
  userId: string,
  patch: Record<string, unknown> = {},
) {
  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: userId,
      date_locale: jourLocal(new Date(), "Europe/Paris"),
      type: "side",
      domaine: "discipline",
      competence_id: "lot3-test",
      titre: `${MARK} mission`,
      description: "test lot 3",
      duree_min: 10,
      difficulte: "moyen",
      payload: { source: "test", prevue: true, perso: false, focusIds: [] },
      xp_prevu: 13,
      statut: "a_faire",
      ...patch,
    })
    .select("id, statut")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert mission");
  return data;
}

async function rpcReady(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("jour_local", {
    p_ts: new Date().toISOString(),
    p_tz: "Europe/Paris",
  });
  return !error;
}

async function main() {
  const missing = requiredEnv();
  if (missing.length) {
    for (const n of [6, 7, 8, 9, 10, 11, 12]) {
      record(
        `${n}`,
        "non exécuté",
        `variables ${missing.join(", ")} absentes de .env.local`,
      );
    }
    printTable();
    process.exit(0);
  }

  let a: Awaited<ReturnType<typeof signIn>>;
  let b: Awaited<ReturnType<typeof signIn>>;
  try {
    a = await signIn(process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!);
    b = await signIn(process.env.TEST_USER_B_EMAIL!, process.env.TEST_USER_B_PASSWORD!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "auth";
    for (const n of [6, 7, 8, 9, 10, 11, 12]) {
      record(`${n}`, "non exécuté", `connexion test : ${msg}`);
    }
    printTable();
    process.exit(0);
  }

  if (!(await rpcReady(a.supabase))) {
    for (const n of [6, 7, 8, 9, 10, 11, 12]) {
      record(`${n}`, "non exécuté", "fonctions 0004/0005 absentes — coller les migrations dans le SQL Editor");
    }
    printTable();
    process.exit(0);
  }

  // 6. double validation simultanée
  try {
    const mission = await createMission(a.supabase, a.user.id, { titre: `${MARK} concurrente` });
    const [r1, r2] = await Promise.allSettled([
      a.supabase.rpc("validate_mission", { p_mission_id: mission.id, p_ressenti: "bien", p_note: "" }),
      a.supabase.rpc("validate_mission", { p_mission_id: mission.id, p_ressenti: "bien", p_note: "" }),
    ]);
    const ok = [r1, r2].filter((r) => r.status === "fulfilled" && !r.value.error);
    const xps = ok.map((r) => (r.status === "fulfilled" ? (r.value.data as { xp?: number } | null)?.xp : undefined));
    const { data: ledger } = await a.supabase.from("xp_ledger").select("id").eq("mission_id", mission.id);
    const once = ok.length === 2 && xps[0] === xps[1] && (ledger?.length ?? 0) === 1;
    record(
      "6",
      once ? "OK" : "ÉCHEC",
      `succès=${ok.length} xp=${xps.join("/")} ledger=${ledger?.length ?? 0}`,
    );
  } catch (err) {
    record("6", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 7. A ne valide pas la mission de B
  try {
    const missionB = await createMission(b.supabase, b.user.id, { titre: `${MARK} de B` });
    const { data, error } = await a.supabase.rpc("validate_mission", {
      p_mission_id: missionB.id,
      p_ressenti: "bien",
      p_note: "",
    });
    const refused = Boolean(error) && !data;
    const { data: ledger } = await b.supabase.from("xp_ledger").select("id").eq("mission_id", missionB.id);
    record(
      "7",
      refused && (ledger?.length ?? 0) === 0 ? "OK" : "ÉCHEC",
      `error=${error?.message ?? "aucune"} ledgerB=${ledger?.length ?? 0}`,
    );
  } catch (err) {
    record("7", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 8. montant client ignoré (RPC n'a pas de paramètre XP)
  try {
    const mission = await createMission(a.supabase, a.user.id, {
      titre: `${MARK} falsifié`,
      duree_min: 10,
      difficulte: "moyen",
      payload: { source: "test", prevue: true, perso: false, focusIds: [] },
    });
    const attendu = calculerXpMission({ dureeMin: 10, difficulte: "moyen", prevue: true, perso: false }, { chaineJours: 0 });
    const { data, error } = await a.supabase.rpc(
      "validate_mission",
      {
        p_mission_id: mission.id,
        p_ressenti: "bien",
        p_note: "",
        p_xp: 99999,
      } as never,
    );
    const xp = (data as { xp?: number } | null)?.xp;
    const ok = !error && typeof xp === "number" && xp === attendu && xp !== 99999 && xp <= 400;
    record(
      "8",
      ok ? "OK" : "ÉCHEC",
      `xpServie=${xp ?? "?"} attendu≈${attendu} (99999 ignoré) err=${error?.message ?? "non"}`,
    );
  } catch (err) {
    record("8", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 9. transaction : note trop longue → rien d'écrit
  try {
    const mission = await createMission(a.supabase, a.user.id, { titre: `${MARK} rollback` });
    const { error } = await a.supabase.rpc("validate_mission", {
      p_mission_id: mission.id,
      p_ressenti: "bien",
      p_note: "x".repeat(2001),
    });
    const { data: val } = await a.supabase.from("mission_validations").select("id").eq("mission_id", mission.id);
    const { data: led } = await a.supabase.from("xp_ledger").select("id").eq("mission_id", mission.id);
    const { data: mis } = await a.supabase.from("missions").select("statut").eq("id", mission.id).maybeSingle();
    const { data: logs } = await a.supabase.from("system_log").select("id").contains("payload", { missionId: mission.id });
    const clean = Boolean(error) && (val?.length ?? 0) === 0 && (led?.length ?? 0) === 0 && mis?.statut === "a_faire" && (logs?.length ?? 0) === 0;
    record(
      "9",
      clean ? "OK" : "ÉCHEC",
      `err=${error?.message ?? "aucune"} val=${val?.length ?? 0} ledger=${led?.length ?? 0} statut=${mis?.statut} logs=${logs?.length ?? 0}`,
    );
  } catch (err) {
    record("9", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 10. reconnexion : mêmes dérivés
  try {
    const snap1 = await loadSnap(a.supabase, a.user.id);
    await a.supabase.auth.signOut();
    const again = await signIn(process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!);
    a = again;
    const snap2 = await loadSnap(again.supabase, again.user.id);
    const same =
      snap1.niveau === snap2.niveau &&
      snap1.power === snap2.power &&
      snap1.xpTotal === snap2.xpTotal &&
      snap1.missionsValidees === snap2.missionsValidees;
    record(
      "10",
      same ? "OK" : "ÉCHEC",
      `avant niv=${snap1.niveau} power=${snap1.power} après niv=${snap2.niveau} power=${snap2.power}`,
    );
  } catch (err) {
    record("10", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 11. 23:59 Paris = jour local
  try {
    const { data: avantMinuit, error: e1 } = await a.supabase.rpc("jour_local", {
      p_ts: "2026-10-12T21:59:00Z",
      p_tz: "Europe/Paris",
    });
    const { data: minuit, error: e2 } = await a.supabase.rpc("jour_local", {
      p_ts: "2026-10-12T22:00:00Z",
      p_tz: "Europe/Paris",
    });
    const ok = !e1 && !e2 && avantMinuit === "2026-10-12" && minuit === "2026-10-13";
    record(
      "11",
      ok ? "OK" : "ÉCHEC",
      `23:59 Paris → ${avantMinuit} ; 00:00 Paris → ${minuit}`,
    );
  } catch (err) {
    record("11", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  // 12. system_log une fois par événement
  try {
    const mission = await createMission(a.supabase, a.user.id, { titre: `${MARK} journal` });
    const { error } = await a.supabase.rpc("validate_mission", {
      p_mission_id: mission.id,
      p_ressenti: "bien",
      p_note: "",
    });
    const { data: logs } = await a.supabase
      .from("system_log")
      .select("type, payload")
      .contains("payload", { missionId: mission.id });
    const types = (logs ?? []).map((l) => l.type);
    const unique = new Set(types);
    const hasValidee = unique.has("mission_validee");
    const hasXp = unique.has("xp_gagnee");
    const noDup = types.length === unique.size;
    record(
      "12",
      !error && hasValidee && hasXp && noDup ? "OK" : "ÉCHEC",
      `types=${types.join(",") || "aucun"} err=${error?.message ?? "non"}`,
    );
  } catch (err) {
    record("12", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  printTable();
}

async function loadSnap(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: ledger }, { data: goals }, { data: missions }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.from("xp_ledger").select("montant, domaine, created_at").eq("user_id", userId),
    supabase.from("goals").select("id, statut").eq("user_id", userId),
    supabase.from("missions").select("id, date_locale, type, statut, goal_id").eq("user_id", userId),
  ]);
  return snapshotDepuisTables({
    ledger: ledger ?? [],
    goals: goals ?? [],
    missions: missions ?? [],
    timezone: profile?.timezone ?? "Europe/Paris",
  });
}

function printTable() {
  console.log("\n--- lot 3 base ---");
  for (const r of rows) {
    console.log(`${r.test}\t${r.result}\t${r.proof}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
