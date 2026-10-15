/**
 * Lot 2 — tests 3 et 5 côté base (DATABASE_URL de .env.local) :
 *  3. UNIQUE sur mission_validations(mission_id) : présence de l'index et refus d'un doublon.
 *  5. Cascade : supabase/tests/lot2_cascade.sql (utilisateur temporaire, pas A/B).
 * Le test 3 tourne dans une transaction annulée : aucune ligne de test ne reste.
 * Usage : npm run test:lot2:sql
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client, type QueryResult } from "pg";

const ROOT = process.cwd();

function lireEnvLocal(): void {
  const fichier = path.join(ROOT, ".env.local");
  if (!existsSync(fichier)) return;
  for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
    const m = ligne.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

type Ligne = { test: string; resultat: "OK" | "ÉCHEC"; preuve: string };
const lignes: Ligne[] = [];
const noter = (test: string, ok: boolean, preuve: string) =>
  lignes.push({ test, resultat: ok ? "OK" : "ÉCHEC", preuve });

async function testUnique(client: Client): Promise<void> {
  const idx = await client.query(`
    select i.relname as nom
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'mission_validations'
      and x.indisunique and x.indnatts = 1
      and (select attname from pg_attribute where attrelid = t.oid and attnum = x.indkey[0]) = 'mission_id'`);
  noter("3 index UNIQUE mission_validations(mission_id)", idx.rowCount! > 0,
    idx.rowCount ? `index ${idx.rows.map((r) => r.nom).join(", ")}` : "aucun index unique sur mission_id");

  const email = process.env.TEST_USER_A_EMAIL;
  await client.query("begin");
  try {
    const u = await client.query("select id from auth.users where email = $1", [email]);
    if (!u.rowCount) throw new Error("compte de test A introuvable");
    const uid = u.rows[0].id;
    const m = await client.query(
      `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min)
       values ($1, current_date, 'side', 'mind', 'lot2-unique', 'lot2-unique', 'lot2-unique', 10) returning id`, [uid]);
    const mid = m.rows[0].id;
    await client.query(
      "insert into public.mission_validations (user_id, mission_id, ressenti, note) values ($1, $2, 'bien', 'lot2-unique')",
      [uid, mid]);
    await client.query("savepoint doublon");
    let refus = "";
    try {
      await client.query(
        "insert into public.mission_validations (user_id, mission_id, ressenti, note) values ($1, $2, 'bien', 'lot2-unique')",
        [uid, mid]);
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      refus = err.code === "23505" ? `doublon refusé (23505, ${err.constraint})` : `autre erreur ${err.code}`;
    }
    noter("3 doublon mission_validations refusé", refus.startsWith("doublon"), refus || "doublon ACCEPTÉ");
  } finally {
    await client.query("rollback");
  }
  const reste = await client.query(
    "select (select count(*) from public.missions where competence_id = 'lot2-unique')::int as m, (select count(*) from public.mission_validations where note = 'lot2-unique')::int as v");
  noter("3 nettoyage", reste.rows[0].m === 0 && reste.rows[0].v === 0,
    `missions restantes=${reste.rows[0].m}, validations restantes=${reste.rows[0].v}`);
}

async function testCascade(client: Client): Promise<void> {
  const sql = readFileSync(path.join(ROOT, "supabase/tests/lot2_cascade.sql"), "utf8");
  const res = (await client.query(sql)) as unknown as QueryResult[];
  const compte = res.find((r) => r.fields?.some((f) => f.name.startsWith("remaining_")))?.rows[0];
  if (!compte) return noter("5 cascade", false, "pas de résultat remaining_*");
  const restes = Object.entries(compte).filter(([, v]) => Number(v) !== 0);
  noter("5 cascade (suppression de l'utilisateur temporaire)", restes.length === 0,
    restes.length ? `restes : ${restes.map(([k, v]) => `${k}=${v}`).join(", ")}`
      : `${Object.keys(compte).length} tables vérifiées, toutes à 0`);
  const tmp = await client.query("select count(*)::int as n from auth.users where email = 'lot2-cascade@themilion.test'");
  noter("5 nettoyage utilisateur temporaire", tmp.rows[0].n === 0, `utilisateurs temporaires restants=${tmp.rows[0].n}`);
}

async function main(): Promise<void> {
  lireEnvLocal();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL absent de .env.local");
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await testUnique(client);
    await testCascade(client);
  } finally {
    await client.end();
  }
  console.log("\n| Test | Résultat | Preuve |\n|---|---|---|");
  for (const l of lignes) console.log(`| ${l.test} | ${l.resultat} | ${l.preuve} |`);
  if (lignes.some((l) => l.resultat !== "OK")) process.exit(1);
}

main().catch((e) => {
  console.error("Erreur :", (e as Error).message);
  process.exit(1);
});
