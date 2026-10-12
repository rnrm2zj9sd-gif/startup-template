/**
 * Isolation RLS lot 2 — se connecte comme A puis B avec la clé anon (comme le navigateur).
 * Jamais de service_role.
 *
 *   npm run test:lot2
 *
 * Variables dans .env.local (jamais dans git) :
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

const MARK = "lot2-iso";

type Status = "OK" | "ÉCHEC" | "non exécuté";
type Row = { test: string; result: Status; proof: string };

const rows: Row[] = [];

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
  const missing = names.filter((name) => !process.env[name]?.trim());
  return { missing };
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
  return { supabase, user: data.user, session: data.session };
}

function denied(error: { message?: string } | null, count: number | null = null) {
  if (error) return true;
  return count === 0;
}

async function testRedirectsWithoutSession() {
  const base = process.env.LOT2_APP_URL ?? "http://localhost:3000";
  for (const path of ["/dashboard", "/onboarding"]) {
    try {
      const res = await fetch(`${base}${path}`, { redirect: "manual" });
      const location = res.headers.get("location") ?? "";
      const ok = res.status >= 300 && res.status < 400 && location.includes("/login");
      record(
        `7 sans session ${path} → /login`,
        ok ? "OK" : "ÉCHEC",
        `HTTP ${res.status} location=${location || "(vide)"}`,
      );
    } catch (err) {
      record(
        `7 sans session ${path} → /login`,
        "non exécuté",
        err instanceof Error ? err.message : "fetch impossible (next dev éteint ?)",
      );
    }
  }
}

async function testIsolation(a: Awaited<ReturnType<typeof signIn>>, b: Awaited<ReturnType<typeof signIn>>) {
  const { data: own, error: ownErr } = await a.supabase.from("profiles").select("id, timezone, is_admin").eq("id", a.user.id).maybeSingle();
  if (ownErr || !own) {
    record("1 profiles A crée/lit sa ligne", "ÉCHEC", ownErr?.message ?? "profil A introuvable");
    return;
  }
  record("1 profiles A lit sa ligne", "OK", `id=${own.id.slice(0, 8)}…`);

  const { error: goalErr, data: goal } = await a.supabase
    .from("goals")
    .insert({
      user_id: a.user.id,
      titre: `${MARK} goal`,
      description: MARK,
      categorie: "Sport",
      statut: "en_cours",
    })
    .select("id")
    .single();
  record("1 A insère goals", goalErr || !goal ? "ÉCHEC" : "OK", goalErr?.message ?? `id=${goal?.id}`);

  const { error: missionErr, data: mission } = await a.supabase
    .from("missions")
    .insert({
      user_id: a.user.id,
      date_locale: "2026-10-12",
      type: "daily",
      domaine: "mind",
      competence_id: MARK,
      titre: `${MARK} mission`,
      description: MARK,
      duree_min: 10,
      difficulte: "moyen",
      payload: { mark: MARK },
      xp_prevu: 5,
      statut: "a_faire",
    })
    .select("id")
    .single();
  record("1 A insère missions", missionErr || !mission ? "ÉCHEC" : "OK", missionErr?.message ?? `id=${mission?.id}`);

  const { error: skillErr, data: skill } = await a.supabase
    .from("user_skill_choices")
    .insert({
      user_id: a.user.id,
      competence_id: MARK,
      focus_ids: ["test"],
      seances_semaine: 3,
      minutes_max: 20,
      mode: "guide",
    })
    .select("id")
    .single();
  record(
    "1 A insère user_skill_choices",
    skillErr || !skill ? "ÉCHEC" : "OK",
    skillErr?.message ?? `id=${skill?.id}`,
  );

  const { error: catalogErr } = await a.supabase.from("custom_catalog").upsert({
    user_id: a.user.id,
    data: { mark: MARK },
  });
  record("1 A écrit custom_catalog", catalogErr ? "ÉCHEC" : "OK", catalogErr?.message ?? "upsert");

  type Owned = { name: string; filter: Record<string, string>; patch: Record<string, unknown>; insertAsA: Record<string, unknown> };
  const owned: Owned[] = [
    {
      name: "profiles",
      filter: { id: a.user.id },
      patch: { pseudo: "hack-par-B" },
      insertAsA: { id: a.user.id, pseudo: "vole" },
    },
    {
      name: "goals",
      filter: { user_id: a.user.id },
      patch: { titre: "hack-par-B" },
      insertAsA: {
        user_id: a.user.id,
        titre: `${MARK} vole`,
        description: MARK,
        categorie: "Sport",
        statut: "a_demarrer",
      },
    },
    {
      name: "missions",
      filter: { user_id: a.user.id },
      patch: { titre: "hack-par-B" },
      insertAsA: {
        user_id: a.user.id,
        date_locale: "2026-10-12",
        type: "daily",
        domaine: "life",
        competence_id: MARK,
        titre: `${MARK} vole`,
        description: MARK,
        duree_min: 5,
        difficulte: "facile",
        payload: {},
        xp_prevu: 1,
        statut: "a_faire",
      },
    },
    {
      name: "user_skill_choices",
      filter: { user_id: a.user.id },
      patch: { minutes_max: 99 },
      insertAsA: {
        user_id: a.user.id,
        competence_id: `${MARK}-vole`,
        focus_ids: [],
        seances_semaine: 1,
        minutes_max: 10,
        mode: "guide",
      },
    },
    {
      name: "custom_catalog",
      filter: { user_id: a.user.id },
      patch: { data: { hack: true } },
      insertAsA: { user_id: a.user.id, data: { vole: true } },
    },
  ];

  for (const table of owned) {
    const { data: seen, error: readErr } = await b.supabase.from(table.name).select("*").match(table.filter);
    const readOk = !readErr && (seen?.length ?? 0) === 0;
    record(
      `1 B ne lit pas ${table.name} de A`,
      readOk ? "OK" : "ÉCHEC",
      readErr ? readErr.message : `rows=${seen?.length ?? 0}`,
    );

    const { data: updated, error: updErr } = await b.supabase.from(table.name).update(table.patch).match(table.filter).select("*");
    const updOk = denied(updErr, updated?.length ?? 0);
    record(
      `1 B ne modifie pas ${table.name} de A`,
      updOk ? "OK" : "ÉCHEC",
      updErr?.message ?? `updated=${updated?.length ?? 0}`,
    );

    const { data: removed, error: delErr } = await b.supabase.from(table.name).delete().match(table.filter).select("*");
    const delOk = denied(delErr, removed?.length ?? 0);
    record(
      `1 B ne supprime pas ${table.name} de A`,
      delOk ? "OK" : "ÉCHEC",
      delErr?.message ?? `deleted=${removed?.length ?? 0}`,
    );

    const { data: still } = await a.supabase.from(table.name).select("*").match(table.filter);
    record(
      `1 ligne A encore là après delete B (${table.name})`,
      (still?.length ?? 0) > 0 ? "OK" : "ÉCHEC",
      `rows=${still?.length ?? 0}`,
    );

    const { error: insErr, data: inserted } = await b.supabase.from(table.name).insert(table.insertAsA).select("*");
    const insOk = Boolean(insErr) || (inserted?.length ?? 0) === 0;
    record(
      `1 B n'insère pas ${table.name} avec l'id de A`,
      insOk ? "OK" : "ÉCHEC",
      insErr?.message ?? `inserted=${inserted?.length ?? 0}`,
    );
  }
}

async function testReadonly(a: Awaited<ReturnType<typeof signIn>>) {
  const readonly = [
    {
      name: "xp_ledger",
      insert: { user_id: a.user.id, montant: 10, raison: MARK, domaine: "mind" },
      patch: { raison: "hack" },
    },
    {
      name: "mission_validations",
      insert: {
        user_id: a.user.id,
        mission_id: "00000000-0000-0000-0000-000000000001",
        ressenti: "bien",
        note: MARK,
      },
      patch: { note: "hack" },
    },
    {
      name: "skill_progress",
      insert: { user_id: a.user.id, competence_id: MARK, focus_id: "x", niveau: 1, palier: 0 },
      patch: { niveau: 9 },
    },
    {
      name: "system_log",
      insert: { user_id: a.user.id, type: MARK, payload: { mark: MARK } },
      patch: { type: "hack" },
    },
    {
      name: "user_achievements",
      insert: { user_id: a.user.id, achievement_id: "lot2_test" },
      patch: { achievement_id: "hack" },
    },
    {
      name: "subscriptions",
      insert: { user_id: a.user.id, statut: "free", plan: "free" },
      patch: { plan: "hack" },
    },
  ] as const;

  for (const table of readonly) {
    const { error: insErr } = await a.supabase.from(table.name).insert(table.insert);
    record(`2 A n'insère pas ${table.name}`, insErr ? "OK" : "ÉCHEC", insErr?.message ?? "INSERT accepté");

    const { data: upd, error: updErr } = await a.supabase.from(table.name).update(table.patch).eq("user_id", a.user.id).select("*");
    record(
      `2 A ne modifie pas ${table.name}`,
      denied(updErr, upd?.length ?? 0) ? "OK" : "ÉCHEC",
      updErr?.message ?? `updated=${upd?.length ?? 0}`,
    );

    const { data: del, error: delErr } = await a.supabase.from(table.name).delete().eq("user_id", a.user.id).select("*");
    record(
      `2 A ne supprime pas ${table.name}`,
      denied(delErr, del?.length ?? 0) ? "OK" : "ÉCHEC",
      delErr?.message ?? `deleted=${del?.length ?? 0}`,
    );
  }
}

async function testUniqueAndAdmin(
  a: Awaited<ReturnType<typeof signIn>>,
  b: Awaited<ReturnType<typeof signIn>>,
) {
  record(
    "3 UNIQUE mission_validations(mission_id)",
    "non exécuté",
    "index prévu: mission_validations_mission_uidx. L'écriture client est refusée (test 2) : la contrainte n'est pas exercée ici, elle le sera au lot 3 via fonction serveur. Catalogue SQL : supabase/tests/lot2_unique_catalog.sql",
  );

  const { data: before } = await a.supabase.from("profiles").select("is_admin").eq("id", a.user.id).maybeSingle();
  const { data: after, error } = await a.supabase
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", a.user.id)
    .select("is_admin");
  const stillFalse = (after?.[0]?.is_admin ?? before?.is_admin) === false;
  const blocked = Boolean(error) || stillFalse;
  record(
    "4 A ne peut pas se passer is_admin",
    blocked && stillFalse ? "OK" : "ÉCHEC",
    error?.message ?? `is_admin=${after?.[0]?.is_admin ?? before?.is_admin}`,
  );

  const { data: pa } = await a.supabase.from("profiles").select("id, timezone").eq("id", a.user.id).maybeSingle();
  const { data: pb } = await b.supabase.from("profiles").select("id, timezone").eq("id", b.user.id).maybeSingle();
  const tzA = Boolean(pa?.timezone);
  const tzB = Boolean(pb?.timezone);
  record(
    "6 trigger profil A et B + timezone",
    pa && pb && tzA && tzB ? "OK" : "ÉCHEC",
    `A tz=${pa?.timezone ?? "∅"} ; B tz=${pb?.timezone ?? "∅"}`,
  );
}

async function testSessionWithA(a: Awaited<ReturnType<typeof signIn>>) {
  const base = process.env.LOT2_APP_URL ?? "http://localhost:3000";
  record(
    "7 avec session A /dashboard",
    "non exécuté",
    `session A obtenue (user ${a.user.id.slice(0, 8)}…) mais le middleware Next lit les cookies SSR, pas un Bearer. À vérifier dans le navigateur : login mot de passe → /dashboard → Déconnexion → /dashboard.`,
  );
  try {
    const res = await fetch(`${base}/dashboard`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    record(
      "7 après déconnexion (cette machine, sans cookie)",
      res.status >= 300 && location.includes("/login") ? "OK" : "ÉCHEC",
      `HTTP ${res.status} location=${location || "(vide)"}`,
    );
  } catch (err) {
    record("7 après déconnexion", "non exécuté", err instanceof Error ? err.message : "fetch impossible");
  }
}

async function cleanup(a: Awaited<ReturnType<typeof signIn>>) {
  await a.supabase.from("goals").delete().eq("description", MARK);
  await a.supabase.from("missions").delete().eq("description", MARK);
  await a.supabase.from("user_skill_choices").delete().eq("competence_id", MARK);
  await a.supabase.from("user_skill_choices").delete().eq("competence_id", `${MARK}-vole`);
  await a.supabase.from("custom_catalog").delete().eq("user_id", a.user.id);
  record("cleanup lignes de test A", "OK", "goals/missions/skill_choices/catalog marqués lot2-iso");
}

async function main() {
  const { missing } = requiredEnv();
  if (missing.length) {
    for (const name of missing) {
      record("env", "non exécuté", `${name} manquante dans .env.local`);
    }
    await testRedirectsWithoutSession();
    record("1 isolation", "non exécuté", "identifiants A/B absents");
    record("2 lecture seule", "non exécuté", "identifiants A/B absents");
    record("3 UNIQUE", "non exécuté", "identifiants A/B absents — voir aussi lot2_unique_catalog.sql");
    record("4 is_admin", "non exécuté", "identifiants A/B absents");
    record("5 cascade", "non exécuté", "script SQL à coller : supabase/tests/lot2_cascade.sql");
    record("6 trigger profil", "non exécuté", "identifiants A/B absents");
    process.exit(2);
  }

  const a = await signIn(process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!);
  const b = await signIn(process.env.TEST_USER_B_EMAIL!, process.env.TEST_USER_B_PASSWORD!);
  record("login A et B (anon)", "OK", "deux sessions distinctes");

  try {
    await testIsolation(a, b);
    await testReadonly(a);
    await testUniqueAndAdmin(a, b);
    await testRedirectsWithoutSession();
    await testSessionWithA(a);
    record("5 cascade", "non exécuté", "à coller dans SQL Editor : supabase/tests/lot2_cascade.sql (crée un user temporaire, pas A/B)");
  } finally {
    await cleanup(a);
    await a.supabase.auth.signOut();
    await b.supabase.auth.signOut();
  }

  const failed = rows.some((r) => r.result === "ÉCHEC");
  process.exit(failed ? 1 : 0);
}

void main().catch((err) => {
  console.error("ERROR", err instanceof Error ? err.message : "inconnu");
  process.exit(1);
});
