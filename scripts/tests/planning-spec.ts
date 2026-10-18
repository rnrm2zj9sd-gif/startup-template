/**
 * Planning : création, isolation, XP via validate_mission, idempotence.
 *   npm run test:planning
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { pairesQuiSeChevauchent } from "../../lib/planning/chevauchements";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

type Status = "OK" | "ÉCHEC" | "non exécuté";
const rows: { n: number; test: string; result: Status; proof: string }[] = [];
function record(n: number, test: string, result: Status, proof: string) {
  rows.push({ n, test, result, proof });
}

const evenements: string[] = [];
const missions: string[] = [];

async function signIn(email: string, password: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "auth");
  return { supabase, user: data.user };
}

function iso(day: string, h: number, m = 0) {
  return new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), h, m)).toISOString();
}

async function creer(
  s: { supabase: SupabaseClient; user: { id: string } },
  patch: Record<string, unknown>,
) {
  const jour = "2030-03-15";
  const row = {
    user_id: s.user.id,
    titre: `planning ${randomUUID().slice(0, 8)}`,
    description: "",
    kind: "productive",
    domaine: "mind",
    difficulte: "moyen",
    start_at: iso(jour, 10),
    end_at: iso(jour, 11),
    xp_prevu: 33,
    ...patch,
  };
  const { data, error } = await s.supabase.from("calendar_events").insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert");
  evenements.push(data.id);
  return data;
}

async function main() {
  const need = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "TEST_USER_A_EMAIL", "TEST_USER_A_PASSWORD", "TEST_USER_B_EMAIL", "TEST_USER_B_PASSWORD", "DATABASE_URL"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    for (let n = 1; n <= 16; n++) record(n, `test ${n}`, "non exécuté", `variables absentes : ${missing.join(", ")}`);
    afficher();
    return;
  }

  const a = await signIn(process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!);
  const b = await signIn(process.env.TEST_USER_B_EMAIL!, process.env.TEST_USER_B_PASSWORD!);
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();

  try {
    const created = await creer(a, { titre: "Réviser la compta" });
    record(1, "créer une tâche productive", created.kind === "productive" && created.statut === "planifiee" ? "OK" : "ÉCHEC", `id=${created.id} statut=${created.statut}`);

    const lu = await a.supabase.from("calendar_events").select("start_at, end_at, titre").eq("id", created.id).maybeSingle();
    record(2, "apparaît au bon horaire", lu.data?.titre === "Réviser la compta" && lu.data.start_at === created.start_at ? "OK" : "ÉCHEC", `${lu.data?.start_at} → ${lu.data?.end_at}`);

    const maj = await a.supabase.from("calendar_events").update({ titre: "Réviser bilan" }).eq("id", created.id).select("titre").single();
    record(3, "modifier le titre", maj.data?.titre === "Réviser bilan" ? "OK" : "ÉCHEC", maj.error?.message ?? maj.data?.titre ?? "");

    const deplace = await a.supabase
      .from("calendar_events")
      .update({ start_at: iso("2030-03-15", 14), end_at: iso("2030-03-15", 15) })
      .eq("id", created.id)
      .select("start_at")
      .single();
    record(4, "déplacer le créneau", deplace.data?.start_at?.includes("14:00") || deplace.data?.start_at?.includes("T14:") ? "OK" : "ÉCHEC", deplace.data?.start_at ?? deplace.error?.message ?? "");

    const perso = await creer(a, { kind: "personnel", domaine: null, difficulte: null, xp_prevu: 0, titre: "Médecin" });
    const finPerso = await a.supabase.rpc("terminer_evenement_calendrier", { p_event_id: perso.id, p_ressenti: "bien" });
    const ledP = await db.query(`select count(*)::int as n from public.xp_ledger where mission_id in (select mission_id from public.calendar_events where id = $1)`, [perso.id]);
    record(5, "événement personnel sans XP", !finPerso.error && Number(finPerso.data?.xp ?? -1) === 0 && ledP.rows[0].n === 0 ? "OK" : "ÉCHEC", `xp=${finPerso.data?.xp} ledger=${ledP.rows[0].n} ${finPerso.error?.message ?? ""}`);

    const pause = await creer(a, { kind: "pause", domaine: null, difficulte: null, xp_prevu: 0, titre: "Déjeuner" });
    const finPause = await a.supabase.rpc("terminer_evenement_calendrier", { p_event_id: pause.id, p_ressenti: "bien" });
    record(6, "pause sans XP", !finPause.error && Number(finPause.data?.xp ?? -1) === 0 ? "OK" : "ÉCHEC", `xp=${finPause.data?.xp} ${finPause.error?.message ?? ""}`);

    const ledAvant = await db.query(`select count(*)::int as n from public.xp_ledger l join public.calendar_events e on e.mission_id = l.mission_id where e.id = $1`, [created.id]);
    record(7, "tâche planifiée sans XP", ledAvant.rows[0].n === 0 && created.statut === "planifiee" ? "OK" : "ÉCHEC", `ledger=${ledAvant.rows[0].n}`);

    const ann = await creer(a, { titre: "À annuler" });
    const annul = await a.supabase.rpc("annuler_evenement_calendrier", { p_event_id: ann.id });
    const ledAnn = await db.query(`select count(*)::int as n from public.xp_ledger l join public.calendar_events e on e.mission_id = l.mission_id where e.id = $1`, [ann.id]);
    record(8, "tâche annulée sans XP", !annul.error && ledAnn.rows[0].n === 0 ? "OK" : "ÉCHEC", annul.error?.message ?? `statut=${annul.data?.statut}`);

    const rep = await creer(a, { titre: "À reporter", start_at: iso("2030-03-15", 8), end_at: iso("2030-03-15", 9) });
    const reporte = await a.supabase.rpc("reporter_evenement_calendrier", { p_event_id: rep.id });
    const ledRep = await db.query(`select count(*)::int as n from public.xp_ledger l join public.calendar_events e on e.mission_id = l.mission_id where e.id = $1`, [rep.id]);
    record(9, "tâche reportée sans XP", !reporte.error && reporte.data?.statut === "reportee" && ledRep.rows[0].n === 0 ? "OK" : "ÉCHEC", `${reporte.data?.statut} ${reporte.data?.start_at}`);

    const prod = await creer(a, { titre: "Séance productive", start_at: iso("2030-03-16", 10), end_at: iso("2030-03-16", 10, 40) });
    const v1 = await a.supabase.rpc("terminer_evenement_calendrier", { p_event_id: prod.id, p_ressenti: "bien" });
    const ev1 = await db.query(`select statut, xp_gagne, mission_id from public.calendar_events where id = $1`, [prod.id]);
    const mid = ev1.rows[0]?.mission_id as string | null;
    if (mid) missions.push(mid);
    const led1 = mid ? await db.query(`select count(*)::int as n, coalesce(sum(montant),0)::int as xp from public.xp_ledger where mission_id = $1`, [mid]) : { rows: [{ n: 0, xp: 0 }] };
    record(10, "terminer une tâche productive", !v1.error && Number(v1.data?.xp) > 0 && ev1.rows[0]?.statut === "terminee" ? "OK" : "ÉCHEC", `xp=${v1.data?.xp} statut=${ev1.rows[0]?.statut} ${v1.error?.message ?? ""}`);
    record(11, "XP via le moteur (ledger)", led1.rows[0].n === 1 && led1.rows[0].xp === Number(v1.data?.xp) ? "OK" : "ÉCHEC", `ledger=${led1.rows[0].n} xp=${led1.rows[0].xp}`);

    const v2 = await a.supabase.rpc("terminer_evenement_calendrier", { p_event_id: prod.id, p_ressenti: "bien" });
    const led2 = mid ? await db.query(`select count(*)::int as n from public.xp_ledger where mission_id = $1`, [mid]) : { rows: [{ n: 0 }] };
    record(12, "double validation sans 2e XP", v2.data?.deja === true && Number(v2.data?.xp) === Number(v1.data?.xp) && led2.rows[0].n === 1 ? "OK" : "ÉCHEC", `deja=${v2.data?.deja} xp=${v2.data?.xp} ledger=${led2.rows[0].n}`);

    const autre = await creer(a, { titre: "Privée A" });
    const vol = await b.supabase.rpc("terminer_evenement_calendrier", { p_event_id: autre.id, p_ressenti: "bien" });
    record(13, "B ne termine pas la tâche de A", Boolean(vol.error) ? "OK" : "ÉCHEC", vol.error?.message ?? "aucune erreur");

    const lectureB = await b.supabase.from("calendar_events").select("id").eq("id", autre.id);
    record(14, "B ne lit pas les événements de A", (lectureB.data ?? []).length === 0 ? "OK" : "ÉCHEC", `lignes=${lectureB.data?.length ?? "?"}`);

    const mauvais = await a.supabase.from("calendar_events").insert({
      user_id: a.user.id,
      titre: "horaire inversé",
      kind: "pause",
      start_at: iso("2030-03-15", 12),
      end_at: iso("2030-03-15", 11),
    }).select("id").single();
    record(15, "fin avant début refusée", Boolean(mauvais.error) ? "OK" : "ÉCHEC", mauvais.error?.message ?? "accepté");

    const c1 = await creer(a, { start_at: iso("2030-03-17", 14), end_at: iso("2030-03-17", 15) });
    const c2 = await creer(a, { start_at: iso("2030-03-17", 14, 30), end_at: iso("2030-03-17", 15, 30) });
    const paires = pairesQuiSeChevauchent([
      { id: c1.id, start: Date.parse(c1.start_at), end: Date.parse(c1.end_at) },
      { id: c2.id, start: Date.parse(c2.start_at), end: Date.parse(c2.end_at) },
    ]);
    record(16, "chevauchements détectés", paires.length === 1 ? "OK" : "ÉCHEC", `paires=${paires.length}`);
  } catch (err) {
    record(99, "suite interrompue", "ÉCHEC", err instanceof Error ? err.message : "erreur");
  } finally {
    if (evenements.length) {
      const lies = await db.query(`select mission_id from public.calendar_events where id = any($1::uuid[]) and mission_id is not null`, [evenements]);
      const mids = [...new Set([...missions, ...lies.rows.map((r) => r.mission_id)])];
      if (mids.length) {
        await db.query(`delete from public.xp_ledger where mission_id = any($1::uuid[])`, [mids]);
        await db.query(`delete from public.mission_validations where mission_id = any($1::uuid[])`, [mids]);
      }
      await db.query(`delete from public.calendar_events where id = any($1::uuid[])`, [evenements]);
      if (mids.length) await db.query(`delete from public.missions where id = any($1::uuid[])`, [mids]);
    }
    await db.end();
    await a.supabase.auth.signOut();
    await b.supabase.auth.signOut();
  }

  afficher();
}

function afficher() {
  console.log("\n| # | Test | Résultat | Preuve |");
  console.log("|---|---|---|---|");
  for (const r of rows.sort((x, y) => x.n - y.n)) {
    console.log(`| ${r.n} | ${r.test} | ${r.result} | ${r.proof} |`);
  }
  if (rows.some((r) => r.result === "ÉCHEC")) process.exitCode = 1;
}

void main();
