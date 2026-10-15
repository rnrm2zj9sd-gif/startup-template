/**
 * Tests du lot 4 contre l'app en route (localhost). Tableau imprimé à la fin.
 *
 *   pnpm dev            (dans un autre terminal)
 *   pnpm test:lot4
 *
 * Les requêtes passent par l'app avec de vraies sessions (clé anon, cookies SSR).
 * DATABASE_URL sert seulement à créer un joueur neuf temporaire, vérifier les
 * lignes écrites puis tout nettoyer. Compte B : TEST_USER_B_* dans .env.local.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import pg from "pg";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

const BASE = process.env.LOT4_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Status = "OK" | "ÉCHEC" | "non exécuté";
const rows: { n: number; test: string; result: Status; proof: string }[] = [];
const TESTS = [
  "Joueur neuf redirigé vers /onboarding",
  "L'onboarding enregistre genre, compétences, budget",
  "Onboarding terminé : /onboarding renvoie au dashboard",
  "La première mission se valide et crédite des XP",
  "Recharger /dashboard ne duplique pas les missions (route)",
  "Une mission du jour se valide (route de l'écran)",
  "« Reporter à demain » pose payload.reportee",
  "A ne voit jamais les missions de B",
  "Le client ne peut plus modifier une mission",
];

function noter(n: number, result: Status, proof: string) {
  rows.push({ n, test: TESTS[n - 1], result, proof });
}

type Session = { cookie: string; client: ReturnType<typeof createServerClient> };

async function connecter(email: string, password: string): Promise<Session> {
  const jar = new Map<string, string>();
  const client = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`connexion impossible : ${error.message}`);
  return {
    client,
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function http(s: Session, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { cookie: s.cookie, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, location: res.headers.get("location") ?? "", json };
}

type Mission = { id: string; type: string; statut: string; date_locale: string; payload: Record<string, unknown> };

async function creerJoueurNeuf(db: pg.Client, { id, email, password }: { id: string; email: string; password: string }) {
  await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
       extensions.crypt($3, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"pseudo":"Neuf"}', now(), now(),
       '', '', '', '', '', '', '', '')`,
    [id, email, password],
  );
  await db.query(
    `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
     values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
    [id, email],
  );
}

async function main() {
  if (!process.env.DATABASE_URL || !SUPABASE_URL || !ANON) throw new Error("variables manquantes dans .env.local");
  const health = await fetch(BASE + "/api/health").catch(() => null);
  if (!health) throw new Error(`l'app ne répond pas sur ${BASE} (lance pnpm dev)`);

  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30_000,
    connectionTimeoutMillis: 20_000,
  });
  await db.connect();
  const id = randomUUID();
  const neuf = { id, email: `lot4-neuf-${id.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };
  let missionB: string | null = null;

  try {
    await creerJoueurNeuf(db, neuf);
    const s = await connecter(neuf.email, neuf.password);

    // 1
    const r1 = await http(s, "GET", "/dashboard");
    noter(1, r1.status === 307 && r1.location.endsWith("/onboarding") ? "OK" : "ÉCHEC",
      `GET /dashboard → ${r1.status} vers ${new URL(r1.location || "/", BASE).pathname}`);

    // 2
    const choix = {
      pseudo: "Neuf Lot4",
      gender: "female",
      competences: [
        { id: "musculation", focusIds: ["abdos", "bras"] },
        { id: "education-financiere", focusIds: [] },
      ],
      budgetMinutes: 20,
      materiel: ["halteres"],
    };
    const refus = await http(s, "POST", "/api/onboarding/terminer", { ...choix, competences: choix.competences.slice(0, 1) });
    const r2 = await http(s, "POST", "/api/onboarding/terminer", choix);
    const prof = (await db.query(`select pseudo, gender, onboarding_done, initiation from public.profiles where id = $1`, [neuf.id])).rows[0];
    const skills = (await db.query(`select competence_id, focus_ids from public.user_skill_choices where user_id = $1 order by competence_id`, [neuf.id])).rows;
    const cat = (await db.query(`select data from public.custom_catalog where user_id = $1`, [neuf.id])).rows[0]?.data ?? {};
    const ok2 = refus.status === 400 && r2.status === 200 && prof?.gender === "female" && prof?.onboarding_done === true
      && prof?.initiation?.budgetMinutes === 20 && skills.length === 2
      && skills.some((k) => k.competence_id === "musculation" && String(k.focus_ids) === "abdos,bras")
      && cat.budgetMinutesJour === 20 && (cat.materiel ?? []).includes("halteres");
    noter(2, ok2 ? "OK" : "ÉCHEC",
      `1 compétence → ${refus.status} ; envoi valide → ${r2.status} ; base : genre=${prof?.gender}, onboarding_done=${prof?.onboarding_done}, ` +
      `compétences=${skills.map((k) => `${k.competence_id}[${(k.focus_ids ?? []).join("+") || "toutes"}]`).join(", ")}, ` +
      `budget=${prof?.initiation?.budgetMinutes} min (catalogue ${cat.budgetMinutesJour}), matériel=${(cat.materiel ?? []).join("+")}`);

    // 3
    const r3a = await http(s, "GET", "/onboarding");
    const r3b = await http(s, "GET", "/dashboard");
    noter(3, r3a.status === 307 && r3a.location.endsWith("/dashboard") && r3b.status === 200 ? "OK" : "ÉCHEC",
      `GET /onboarding → ${r3a.status} vers ${new URL(r3a.location || "/", BASE).pathname} ; GET /dashboard → ${r3b.status}`);

    // 4
    const premiere = r2.json.mission as Mission & { duree_min: number };
    const r2bis = await http(s, "POST", "/api/onboarding/terminer", choix);
    const v = await http(s, "POST", `/api/missions/${premiere.id}/valider`, { ressenti: "bien" });
    const prog = await http(s, "GET", "/api/me/progression");
    const ledger = (await db.query(`select coalesce(sum(montant),0)::int as xp from public.xp_ledger where user_id = $1 and mission_id = $2`, [neuf.id, premiere.id])).rows[0].xp;
    const firsts = (await db.query(`select count(*)::int as n from public.missions where user_id = $1 and type = 'first'`, [neuf.id])).rows[0].n;
    const xp = Number(v.json.xp ?? 0);
    noter(4, v.status === 200 && xp > 0 && ledger === xp && prog.json.xpTotal === xp && firsts === 1 && premiere.duree_min === 2 ? "OK" : "ÉCHEC",
      `mission first de ${premiere.duree_min} min ; valider → ${v.status}, +${xp} XP ; xp_ledger=${ledger} ; progression xpTotal=${prog.json.xpTotal}, ` +
      `niv ${prog.json.niveau} ; 2e envoi onboarding → même mission (${(r2bis.json.mission as Mission | undefined)?.id === premiere.id}), missions first=${firsts}`);

    // 5
    const g1 = await http(s, "POST", "/api/missions/generer");
    const g2 = await http(s, "POST", "/api/missions/generer");
    const g3 = await http(s, "POST", "/api/missions/generer");
    const ids = (r: typeof g1) => ((r.json.missions as Mission[]) ?? []).filter((m) => m.type === "daily").map((m) => m.id).sort().join(",");
    const today = String(g1.json.date);
    const nbDaily = (await db.query(`select count(*)::int as n from public.missions where user_id = $1 and type = 'daily' and date_locale = $2`, [neuf.id, today])).rows[0].n;
    const runs = (await db.query(`select count(*)::int as n from public.daily_runs where user_id = $1`, [neuf.id])).rows[0].n;
    const nbG1 = ids(g1).split(",").filter(Boolean).length;
    noter(5, nbG1 > 0 && ids(g1) === ids(g2) && ids(g2) === ids(g3) && nbDaily === nbG1 && runs === 1 && g2.json.created === false && g3.json.created === false ? "OK" : "ÉCHEC",
      `3 appels generer → création ${g1.json.created} / ${g2.json.created} / ${g3.json.created}, mêmes ids (${nbG1} missions daily) ; base : ${nbDaily} daily ce jour, daily_runs=${runs}`);

    // 6 et 7
    const daily = ((g1.json.missions as Mission[]) ?? []).filter((m) => m.type === "daily");
    if (daily.length < 2) {
      noter(6, "non exécuté", `il faut 2 missions daily, plan du jour = ${daily.length}`);
      noter(7, "non exécuté", "idem");
      noter(9, "non exécuté", "idem");
    } else {
      const [aValider, aReporter] = daily;
      const v6 = await http(s, "POST", `/api/missions/${aValider.id}/valider`, { ressenti: "trop_facile" });
      const v6bis = await http(s, "POST", `/api/missions/${aValider.id}/valider`, { ressenti: "bien" });
      const m6 = (await db.query(`select statut from public.missions where id = $1`, [aValider.id])).rows[0];
      const val6 = (await db.query(`select ressenti from public.mission_validations where mission_id = $1`, [aValider.id])).rows;
      const journal = await http(s, "GET", "/api/me/journal");
      const lignes = (journal.json.lignes ?? []) as { type: string; payload: { missionId?: string } }[];
      const vuJournal = lignes.some((l) => l.type === "mission_validee" && l.payload?.missionId === aValider.id);
      noter(6, v6.status === 200 && Number(v6.json.xp) > 0 && v6bis.status >= 400 && m6?.statut === "terminee" && val6.length === 1 && vuJournal ? "OK" : "ÉCHEC",
        `valider → ${v6.status} (+${v6.json.xp} XP, ressenti ${val6[0]?.ressenti}) ; 2e validation → ${v6bis.status} ; statut=${m6?.statut} ; ` +
        `journal : ${lignes.length} lignes, mission_validee présente=${vuJournal}`);

      const rep = await http(s, "POST", `/api/missions/${aReporter.id}/reporter`);
      const repTerminee = await http(s, "POST", `/api/missions/${aValider.id}/reporter`);
      const m7 = (await db.query(`select date_locale::text as d, payload from public.missions where id = $1`, [aReporter.id])).rows[0];
      const apres = await http(s, "POST", "/api/missions/generer");
      const encoreAujourdhui = ((apres.json.missions as Mission[]) ?? []).some((m) => m.id === aReporter.id);
      const snap = await http(s, "GET", "/api/me/progression");
      noter(7, rep.status === 200 && m7?.payload?.reportee === true && m7?.d > today && !encoreAujourdhui && repTerminee.status === 409 ? "OK" : "ÉCHEC",
        `reporter → ${rep.status} ; base : payload.reportee=${m7?.payload?.reportee}, date ${today} → ${m7?.d} ; ` +
        `absente des missions du jour=${!encoreAujourdhui} ; reporter une mission validée → ${repTerminee.status} ; discipline=${snap.json.discipline}`);

      // 9 : plus aucune écriture client sur une mission existante
      const avant = (await db.query(`select id, duree_min, difficulte, xp_prevu, statut, date_locale::text as d, payload from public.missions where id in ($1, $2) order by id`, [aReporter.id, aValider.id])).rows;
      const essais: [string, string, Record<string, unknown>][] = [
        ["durée", aReporter.id, { duree_min: 600 }],
        ["difficulté", aReporter.id, { difficulte: "difficile" }],
        ["XP", aReporter.id, { xp_prevu: 9999 }],
        ["statut", aValider.id, { statut: "a_faire" }],
        ["date et payload", aReporter.id, { date_locale: today, payload: {} }],
      ];
      const refus: string[] = [];
      let toutRefuse = true;
      for (const [nom, missionId, patch] of essais) {
        const { data, error } = await s.client.from("missions").update(patch).eq("id", missionId).select("id");
        const refuse = !!error && (data ?? []).length === 0;
        toutRefuse &&= refuse;
        refus.push(`${nom} → ${refuse ? `refusé (${error?.code})` : "ACCEPTÉ"}`);
      }
      const apresEssais = (await db.query(`select id, duree_min, difficulte, xp_prevu, statut, date_locale::text as d, payload from public.missions where id in ($1, $2) order by id`, [aReporter.id, aValider.id])).rows;
      const intactes = JSON.stringify(avant) === JSON.stringify(apresEssais);
      const anon = createServerClient(SUPABASE_URL, ANON, { cookies: { getAll: () => [], setAll: () => {} } });
      const rpcAnon = await anon.rpc("reporter_mission", { p_mission_id: aReporter.id });
      const rpcDemain = await s.client.rpc("reporter_mission", { p_mission_id: aReporter.id });
      noter(9, toutRefuse && intactes && !!rpcAnon.error && !!rpcDemain.error ? "OK" : "ÉCHEC",
        `${refus.join(" ; ")} ; missions inchangées en base=${intactes} ; reporter_mission sans session → ${rpcAnon.error ? "refusé" : "ACCEPTÉ"} ; ` +
        `re-reporter une mission déjà à demain → ${rpcDemain.error?.message ?? "ACCEPTÉ"}`);
    }

    // 8 : comptes de test A et B, chacun attaque la mission de l'autre
    const emailA = process.env.TEST_USER_A_EMAIL;
    const emailB = process.env.TEST_USER_B_EMAIL;
    if (!emailA || !emailB || !process.env.TEST_USER_A_PASSWORD || !process.env.TEST_USER_B_PASSWORD) {
      noter(8, "non exécuté", "TEST_USER_A_* ou TEST_USER_B_* absent");
    } else {
      const a = await connecter(emailA, process.env.TEST_USER_A_PASSWORD);
      const b = await connecter(emailB, process.env.TEST_USER_B_PASSWORD);
      const ids = (await db.query(`select id, email from auth.users where email in ($1, $2)`, [emailA, emailB])).rows;
      const idA = ids.find((r) => r.email === emailA).id as string;
      const idB = ids.find((r) => r.email === emailB).id as string;
      missionB = (await db.query(
        `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, duree_min, difficulte, payload, xp_prevu, statut)
         values ($1, $2, 'daily', 'fitness', 'lot4-iso', 'lot4 isolation', 10, 'moyen', '{}', 10, 'a_faire') returning id`,
        [idB, today],
      )).rows[0].id as string;
      const missionA = (await db.query(`select id from public.missions where user_id = $1 order by created_at desc limit 1`, [idA])).rows[0]?.id as string | undefined;

      const voitB = await b.client.from("missions").select("id").eq("id", missionB);
      const lectureA = await a.client.from("missions").select("id").eq("id", missionB);
      const toutA = await a.client.from("missions").select("user_id");
      const toutB = await b.client.from("missions").select("user_id");
      const etrangeresA = (toutA.data ?? []).filter((m: { user_id: string }) => m.user_id !== idA).length;
      const etrangeresB = (toutB.data ?? []).filter((m: { user_id: string }) => m.user_id !== idB).length;
      const genA = await http(a, "POST", "/api/missions/generer");
      const dansA = ((genA.json.missions as Mission[]) ?? []).some((m) => m.id === missionB);
      const journalA = await http(a, "GET", "/api/me/journal");
      const logB = ((journalA.json.lignes ?? []) as { payload: { missionId?: string } }[]).some((l) => l.payload?.missionId === missionB);
      const valA = await http(a, "POST", `/api/missions/${missionB}/valider`, { ressenti: "bien" });
      const repA = await http(a, "POST", `/api/missions/${missionB}/reporter`);
      const majA = await a.client.from("missions").update({ titre: "piraté" }).eq("id", missionB).select("id");
      const lectureB = missionA ? await b.client.from("missions").select("id").eq("id", missionA) : { data: [] };
      const valB = missionA ? await http(b, "POST", `/api/missions/${missionA}/valider`, { ressenti: "bien" }) : { status: 0 };
      const etatB = (await db.query(`select statut, titre, payload from public.missions where id = $1`, [missionB])).rows[0];
      const ok8 = genA.status === 200 && (voitB.data ?? []).length === 1 && (lectureA.data ?? []).length === 0
        && etrangeresA === 0 && etrangeresB === 0 && !dansA && !logB
        && valA.status >= 400 && (repA.status === 403 || repA.status === 404) && (majA.data ?? []).length === 0
        && etatB.statut === "a_faire" && etatB.titre === "lot4 isolation" && !etatB.payload?.reportee
        && !!missionA && (lectureB.data ?? []).length === 0 && valB.status >= 400;
      noter(8, ok8 ? "OK" : "ÉCHEC",
        `B voit sa mission (${(voitB.data ?? []).length}) ; A la lit : ${(lectureA.data ?? []).length} ligne ; ` +
        `missions d'autrui visibles : A ${etrangeresA} (sur ${(toutA.data ?? []).length}), B ${etrangeresB} (sur ${(toutB.data ?? []).length}) ; ` +
        `dans le Daily de A : ${dansA} ; dans le journal de A : ${logB} ; A valide → ${valA.status}, reporte → ${repA.status}, modifie → ${(majA.data ?? []).length} ligne ; ` +
        `B lit une mission de A : ${(lectureB.data ?? []).length}, la valide → ${valB.status} ; mission de B intacte`);
    }
  } finally {
    if (missionB) await db.query(`delete from public.missions where id = $1`, [missionB]);
    await db.query(`delete from auth.users where id = $1`, [neuf.id]);
    const reste = (await db.query(`select count(*)::int as n from public.profiles where id = $1`, [neuf.id])).rows[0].n;
    console.log(`Nettoyage : joueur temporaire supprimé (profil restant : ${reste}).`);
    await db.end();
  }
}

main()
  .catch((e) => console.error("Erreur :", (e as Error).message))
  .finally(() => {
    for (let n = 1; n <= TESTS.length; n++) if (!rows.some((r) => r.n === n)) noter(n, "non exécuté", "arrêt avant ce test");
    rows.sort((a, b) => a.n - b.n);
    console.log("\n| # | Test | Résultat | Preuve |\n|---|------|----------|--------|");
    for (const r of rows) console.log(`| ${r.n} | ${r.test} | ${r.result} | ${r.proof.replace(/\|/g, "/")} |`);
    const ok = rows.filter((r) => r.result === "OK").length;
    console.log(`\n${ok}/${rows.length} OK`);
    process.exitCode = ok === rows.length ? 0 : 1;
  });
