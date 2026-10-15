/**
 * 12 tests du lot 3. Tableau imprimé à la fin.
 *
 *   npm run test:lot3
 *
 * Les tests 1, 2, 3 et 12 parlent à Supabase (clé anon).
 * Ils exigent TEST_USER_A_* et TEST_USER_B_* dans .env.local.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { ajouterJours, enregistrerResultat, etatInitial, type SeancePrevue } from "../../lib/moteur";
import { chaineDepuisJours } from "../../lib/progression/chaine";
import { niveauDepuisXp, rangDepuisNiveau, xpPourNiveau } from "../../lib/progression/niveau";
import { calculerPower, objectifValide } from "../../lib/progression/power";
import { appliquerPlafondQuotidien, calculerXpMission } from "../../lib/progression/xp";
import { XP_JOUR_MAX } from "../../lib/progression/config";
import { jourLocal } from "../../lib/temps";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

type Status = "OK" | "ÉCHEC" | "non exécuté";
type Row = { n: number; test: string; result: Status; proof: string };

const rows: Row[] = [];

function record(n: number, test: string, result: Status, proof: string) {
  rows.push({ n, test, result, proof });
}

function seance(date: string): SeancePrevue {
  return {
    date,
    competenceId: "lot3",
    competence: "Lot",
    focusIds: [],
    focusNoms: [],
    exercices: [],
    minutesTotal: 10,
    xpEstime: 10,
    missionPlancher: "",
  };
}

function chaineMoteur(dates: string[]) {
  let etat = etatInitial();
  for (const date of dates) etat = enregistrerResultat(etat, seance(date), "bien");
  return etat.chaineJours;
}

function requiredEnv() {
  return [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "TEST_USER_A_EMAIL",
    "TEST_USER_A_PASSWORD",
    "TEST_USER_B_EMAIL",
    "TEST_USER_B_PASSWORD",
  ].filter((name) => !process.env[name]?.trim());
}

function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string) {
  const supabase = anonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "session absente");
  return { supabase, user: data.user };
}

function jourPasseAuHasard(): string {
  return new Date(Date.UTC(2000, 0, 1) + Math.floor(Math.random() * 7300) * 86_400_000).toISOString().slice(0, 10);
}

async function openDb() {
  if (!process.env.DATABASE_URL) throw new Error("préparation impossible : connexion directe absente");
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  return db;
}

const missionsTest: string[] = [];

async function createMission(db: pg.Client, userId: string, patch: Record<string, unknown> = {}) {
  const row = {
    user_id: userId,
    date_locale: jourPasseAuHasard(),
    type: "daily",
    domaine: "discipline",
    competence_id: `lot3-test-${randomUUID().slice(0, 8)}`,
    titre: `lot3 ${Date.now()}`,
    description: "test lot 3",
    duree_min: 10,
    difficulte: "moyen",
    payload: { source: "test", prevue: true, perso: false, focusIds: [] },
    xp_prevu: 16,
    statut: "a_faire",
    ...patch,
  };
  const ins = await db.query(
    `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min, difficulte, payload, xp_prevu, statut)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12) returning id`,
    [
      row.user_id,
      row.date_locale,
      row.type,
      row.domaine,
      row.competence_id,
      row.titre,
      row.description,
      row.duree_min,
      row.difficulte,
      JSON.stringify(row.payload),
      row.xp_prevu,
      row.statut,
    ],
  );
  const id = ins.rows[0]?.id as string | undefined;
  if (!id) throw new Error("insert mission");
  missionsTest.push(id);
  return { id };
}

function testsPurs() {
  const coupe = appliquerPlafondQuotidien({
    xpBrut: 80,
    xpDejaDuJour: XP_JOUR_MAX - 30,
    xpPersoDejaDuJour: 0,
    estPerso: false,
  });
  record(
    4,
    "plafond 400 XP/jour",
    coupe.xp === 30 && coupe.plafond === "quotidien" ? "OK" : "ÉCHEC",
    `reste 30, crédité ${coupe.xp}`,
  );

  const perso = appliquerPlafondQuotidien({
    xpBrut: 300,
    xpDejaDuJour: 100,
    xpPersoDejaDuJour: 0,
    estPerso: true,
  });
  const okPerso = perso.xp === 150 && perso.plafond === "perso" && perso.xp / (100 + perso.xp) === 0.6;
  record(5, "plafond perso 60 %", okPerso ? "OK" : "ÉCHEC", `crédité ${perso.xp} sur un jour à ${100 + perso.xp}`);

  const debut = "2026-10-01";
  const suite = [0, 1, 2, 3].map((i) => ajouterJours(debut, i));
  const fissure = chaineMoteur([...suite, ajouterJours(debut, 5)]);
  const meme = chaineDepuisJours([...suite, ajouterJours(debut, 5)]);
  record(
    6,
    "chaîne qui se fissure (1 jour manqué)",
    fissure === 5 && meme === 5 ? "OK" : "ÉCHEC",
    `chaîne 4 puis jour sauté → ${fissure} (conservée)`,
  );

  const divisee = chaineMoteur([...suite, ajouterJours(debut, 6)]);
  record(
    7,
    "chaîne divisée par 2 (2 jours ou plus)",
    divisee === Math.floor(4 / 2) + 1 ? "OK" : "ÉCHEC",
    `chaîne 4 puis 2 jours sautés → ${divisee}`,
  );

  const seuils: [number, string][] = [
    [1, "E"],
    [4, "E"],
    [5, "D"],
    [9, "D"],
    [10, "C"],
    [19, "C"],
    [20, "B"],
    [34, "B"],
    [35, "A"],
    [49, "A"],
    [50, "S"],
    [99, "S"],
    [100, "SS"],
  ];
  const seuilOk = seuils.every(([n, rang]) => rangDepuisNiveau(n) === rang);
  const courbe = xpPourNiveau(1) === Math.round(120 * 1 ** 0.6);
  record(
    8,
    "niveau et rang corrects à des seuils connus",
    seuilOk && courbe ? "OK" : "ÉCHEC",
    `E 1-4, D 5-9, C 10-19, B 20-34, A 35-49, S 50-99, SS 100+ ; XP(1)=${xpPourNiveau(1)}`,
  );

  const ordre = ["E", "D", "C", "B", "A", "S", "SS"];
  let xp = 0;
  let plancher = 0;
  let monotone = true;
  for (const gain of [0, 40, 180, 900, 4000, 25000]) {
    xp += gain;
    const idx = ordre.indexOf(rangDepuisNiveau(niveauDepuisXp(xp)));
    if (idx < plancher) monotone = false;
    plancher = idx;
  }
  record(9, "rang qui ne descend pas", monotone ? "OK" : "ÉCHEC", "XP seulement en hausse, rang monotone");

  const sans = calculerPower({ niveauxDomaines: { finance: 0, mind: 0, health: 0, fitness: 0, discipline: 0, life: 0 }, objectifsValides: 0 });
  const invalide = objectifValide(2);
  const valide = objectifValide(3);
  const avec = calculerPower({ niveauxDomaines: { finance: 0, mind: 0, health: 0, fitness: 0, discipline: 0, life: 0 }, objectifsValides: 1 });
  record(
    10,
    "Power avec objectif valide et non valide",
    !invalide && valide && avec === sans + 25 ? "OK" : "ÉCHEC",
    `2 missions liées → 0 ; 3 missions → +25 (power ${avec})`,
  );

  const avant = jourLocal(new Date("2026-10-11T21:30:00Z"), "Europe/Paris");
  const apres = jourLocal(new Date("2026-10-11T22:30:00Z"), "Europe/Paris");
  record(
    11,
    "changement de jour selon le fuseau (Europe/Paris)",
    avant === "2026-10-11" && apres === "2026-10-12" ? "OK" : "ÉCHEC",
    `23:30 → ${avant} ; 00:30 → ${apres}`,
  );
}

async function testsBase() {
  const missing = requiredEnv();
  if (missing.length) {
    const proof = `variables absentes : ${missing.join(", ")}`;
    for (const [n, test] of [
      [1, "validation normale"],
      [2, "double validation refusée"],
      [3, "mission d'un autre joueur refusée"],
      [12, "écriture directe dans xp_ledger refusée depuis le client"],
    ] as const) {
      record(n, test, "non exécuté", proof);
    }
    return;
  }

  let a: Awaited<ReturnType<typeof signIn>>;
  let b: Awaited<ReturnType<typeof signIn>>;
  let db: pg.Client;
  try {
    a = await signIn(process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!);
    b = await signIn(process.env.TEST_USER_B_EMAIL!, process.env.TEST_USER_B_PASSWORD!);
    db = await openDb();
  } catch (err) {
    const proof = err instanceof Error ? err.message : "auth";
    for (const [n, test] of [
      [1, "validation normale"],
      [2, "double validation refusée"],
      [3, "mission d'un autre joueur refusée"],
      [12, "écriture directe dans xp_ledger refusée depuis le client"],
    ] as const) {
      record(n, test, "non exécuté", proof);
    }
    return;
  }

  try {
    const { error } = await a.supabase.from("xp_ledger").insert({
      user_id: a.user.id,
      montant: 10,
      raison: "client",
      domaine: "discipline",
    });
    record(
      12,
      "écriture directe dans xp_ledger refusée depuis le client",
      error ? "OK" : "ÉCHEC",
      error?.message ?? "insert accepté",
    );
  } catch (err) {
    record(12, "écriture directe dans xp_ledger refusée depuis le client", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  try {
  const { error: rpcMissing } = await a.supabase.rpc("jour_local", {
    p_ts: new Date().toISOString(),
    p_tz: "Europe/Paris",
  });
  if (rpcMissing) {
    const proof = `migration 0004 absente (${rpcMissing.message})`;
    for (const [n, test] of [
      [1, "validation normale"],
      [2, "double validation refusée"],
      [3, "mission d'un autre joueur refusée"],
    ] as const) {
      record(n, test, "non exécuté", proof);
    }
    return;
  }

  try {
    const mission = await createMission(db, a.user.id);
    const attendu = calculerXpMission(
      { dureeMin: 10, difficulte: "moyen", prevue: true, perso: false },
      { chaineJours: 0 },
    );
    const { data, error } = await a.supabase.rpc("validate_mission", {
      p_mission_id: mission.id,
      p_ressenti: "bien",
      p_note: "",
    });
    const xp = (data as { xp?: number } | null)?.xp;
    const { data: led } = await a.supabase.from("xp_ledger").select("id").eq("mission_id", mission.id);
    const { data: val } = await a.supabase.from("mission_validations").select("id").eq("mission_id", mission.id);
    const { data: mis } = await a.supabase.from("missions").select("statut").eq("id", mission.id).maybeSingle();
    const ok = !error && xp === attendu && (led?.length ?? 0) === 1 && (val?.length ?? 0) === 1 && mis?.statut === "terminee";
    record(1, "validation normale", ok ? "OK" : "ÉCHEC", `xp=${xp ?? "?"} attendu=${attendu} statut=${mis?.statut ?? "?"}`);
  } catch (err) {
    record(1, "validation normale", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  try {
    const mission = await createMission(db, a.user.id);
    const [r1, r2] = await Promise.allSettled([
      a.supabase.rpc("validate_mission", { p_mission_id: mission.id, p_ressenti: "bien", p_note: "" }),
      a.supabase.rpc("validate_mission", { p_mission_id: mission.id, p_ressenti: "bien", p_note: "" }),
    ]);
    const ok = [r1, r2].filter((r) => r.status === "fulfilled" && !r.value.error).length;
    const { data: led } = await a.supabase.from("xp_ledger").select("id").eq("mission_id", mission.id);
    record(
      2,
      "double validation refusée",
      ok === 1 && (led?.length ?? 0) === 1 ? "OK" : "ÉCHEC",
      `succès=${ok} ledger=${led?.length ?? 0}`,
    );
  } catch (err) {
    record(2, "double validation refusée", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }

  try {
    const missionB = await createMission(db, b.user.id);
    const { error } = await a.supabase.rpc("validate_mission", {
      p_mission_id: missionB.id,
      p_ressenti: "bien",
      p_note: "",
    });
    const { data: led } = await b.supabase.from("xp_ledger").select("id").eq("mission_id", missionB.id);
    record(
      3,
      "mission d'un autre joueur refusée",
      Boolean(error) && (led?.length ?? 0) === 0 ? "OK" : "ÉCHEC",
      error?.message ?? "aucune erreur",
    );
  } catch (err) {
    record(3, "mission d'un autre joueur refusée", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  }
  } finally {
    if (missionsTest.length) {
      await db.query(`delete from public.xp_ledger where mission_id = any($1::uuid[])`, [missionsTest]);
      await db.query(`delete from public.missions where id = any($1::uuid[])`, [missionsTest]);
    }
    await db.end();
  }
}

function printTable() {
  const order = [...rows].sort((a, b) => a.n - b.n);
  console.log("\n| # | Test | Résultat | Preuve |");
  console.log("|---|---|---|---|");
  for (const r of order) {
    console.log(`| ${r.n} | ${r.test} | ${r.result} | ${r.proof} |`);
  }
}

async function main() {
  testsPurs();
  await testsBase();
  printTable();
  const failed = rows.some((r) => r.result === "ÉCHEC");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
