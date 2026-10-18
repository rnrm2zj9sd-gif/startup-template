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
  "Insertion de 999 minutes (ou 1) refusée",
  "Difficulté inconnue refusée",
  "Statut « terminee » et type « side » refusés à l'insertion",
  "13e mission du jour refusée",
  "user_id d'un autre joueur refusé (RLS)",
  "L'onboarding et la génération normale fonctionnent toujours",
  "Plafond 400 XP/jour tenu avec des missions gonflées",
  "Fuseau POSIX, inconnu refusés ; Europe/Paris accepté",
  "Deux changements de fuseau à moins de 7 jours : le second est refusé",
  "Mission datée d'il y a 5 jours ou dans 5 jours refusée",
  "Attaque des 800 XP : le total reste à 400 par jour local",
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
      const journalMission = lignes.filter((l) => l.type === "mission_validee" && l.payload?.missionId === aValider.id).length;
      noter(6, v6.status === 200 && Number(v6.json.xp) > 0 && v6bis.status === 200 && v6bis.json.deja === true && v6bis.json.xp === v6.json.xp && m6?.statut === "terminee" && val6.length === 1 && val6[0]?.ressenti === "trop_facile" && journalMission === 1 ? "OK" : "ÉCHEC",
        `valider → ${v6.status} (+${v6.json.xp} XP, ressenti ${val6[0]?.ressenti}) ; 2e validation → ${v6bis.status} deja=${v6bis.json.deja} xp=${v6bis.json.xp} ; statut=${m6?.statut} ; ` +
        `journal : ${lignes.length} lignes, mission_validee=${journalMission}`);

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

    // 10 à 15 : limites d'insertion (trigger missions_limites_insert), sur le joueur neuf
    const base = (patch: Record<string, unknown> = {}) => ({
      user_id: neuf.id,
      date_locale: today,
      type: "daily",
      domaine: "fitness",
      competence_id: `lot4-lim-${randomUUID().slice(0, 8)}`,
      titre: "lot4 limites",
      description: "",
      duree_min: 10,
      difficulte: "moyen",
      payload: { prevue: true, perso: false },
      xp_prevu: 10,
      statut: "a_faire",
      ...patch,
    });
    const inserer = async (patch: Record<string, unknown> = {}) => {
      const row = base(patch);
      const diff = String(row.difficulte ?? "moyen");
      const exo = diff === "difficile" ? "hollow-hold" : diff === "facile" ? "crunch" : "planche";
      const payload = {
        exerciceId: exo,
        ...(row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {}),
      };
      if (!payload.exerciceId) payload.exerciceId = exo;
      return s.client.from("missions").insert({ ...row, payload }).select("id").maybeSingle();
    };

    const r999 = await inserer({ duree_min: 999 });
    const rUne = await inserer({ duree_min: 1 });
    noter(10, !!r999.error && !!rUne.error ? "OK" : "ÉCHEC",
      `999 min → ${r999.error?.message ?? "ACCEPTÉ"} ; 1 min → ${rUne.error?.message ?? "ACCEPTÉ"}`);

    const rDiff = await inserer({ difficulte: "legendaire" });
    noter(11, rDiff.error ? "OK" : "ÉCHEC", `difficulté « legendaire » → ${rDiff.error?.message ?? "ACCEPTÉ"}`);

    const rStatut = await inserer({ statut: "terminee" });
    const rType = await inserer({ type: "side" });
    noter(12, !!rStatut.error && !!rType.error ? "OK" : "ÉCHEC",
      `statut terminee → ${rStatut.error?.message ?? "ACCEPTÉ"} ; type side → ${rType.error?.message ?? "ACCEPTÉ"}`);

    const demain = (await db.query(`select ($1::date + 1)::text as d`, [today])).rows[0].d as string;
    const deja = (await db.query(
      `select count(*)::int as n from public.missions where user_id = $1 and date_locale = $2 and statut <> 'annulee'`,
      [neuf.id, demain],
    )).rows[0].n as number;
    let acceptees = 0;
    for (let i = deja; i < 12; i++) if (!(await inserer({ date_locale: demain })).error) acceptees++;
    const r13 = await inserer({ date_locale: demain });
    const nbJour = (await db.query(`select count(*)::int as n from public.missions where user_id = $1 and date_locale = $2`, [neuf.id, demain])).rows[0].n;
    noter(13, deja + acceptees === 12 && !!r13.error && nbJour === 12 ? "OK" : "ÉCHEC",
      `${deja} déjà + ${acceptees} = ${nbJour}/12 le ${demain} ; 13e → ${r13.error?.message ?? "ACCEPTÉE"}`);

    const rUid = await s.client.from("missions").insert(base({ user_id: randomUUID() })).select("id").maybeSingle();
    noter(14, rUid.error ? "OK" : "ÉCHEC", `user_id d'un autre → ${rUid.error?.message ?? "ACCEPTÉ"} (RLS missions_insert_own)`);

    const premiereOk = r2.status === 200 && (r2.json.mission as Mission | undefined)?.type === "first";
    noter(15, premiereOk && g1.status === 200 && g1.json.created === true && nbG1 > 0 ? "OK" : "ÉCHEC",
      `onboarding → ${r2.status}, mission first créée ; generer → ${g1.status}, ${nbG1} missions daily créées (trigger actif)`);

    // 16 : plafond de 400 XP avec beaucoup de missions gonflées (fuseau fixe)
    const gonflees: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { data } = await inserer({ duree_min: 60, difficulte: "difficile", payload: { prevue: true, perso: false, niveauMoyen: 4 } });
      if (data) gonflees.push(data.id);
    }
    const credits: number[] = [];
    for (const id of gonflees) credits.push(Number((await http(s, "POST", `/api/missions/${id}/valider`, { ressenti: "bien" })).json.xp ?? 0));
    const xpJour = (await db.query(
      `select coalesce(sum(montant), 0)::int as xp from public.xp_ledger where user_id = $1 and public.jour_local(created_at, 'Europe/Paris') = $2`,
      [neuf.id, today],
    )).rows[0].xp;
    noter(16, gonflees.length === 5 && xpJour === 400 ? "OK" : "ÉCHEC",
      `5 missions de 60 min « difficile » validées → +${credits.join(" / +")} XP ; total du jour en base : ${xpJour} (plafond 400)`);

    const tzInscription = (await db.query(`select timezone from public.profiles where id = $1`, [neuf.id])).rows[0].timezone as string;
    const posix = await s.client.from("profiles").update({ timezone: "UTC-9:40" }).eq("id", neuf.id).select("timezone");
    const inconnu = await s.client.from("profiles").update({ timezone: "Mars/Phobos" }).eq("id", neuf.id).select("timezone");
    const paris = await s.client.from("profiles").update({ timezone: "Europe/Paris" }).eq("id", neuf.id).select("timezone");
    const setPseudo = await s.client.from("profiles").update({ pseudo: "Neuf Lot4" }).eq("id", neuf.id).select("pseudo");
    const tzApres = (await db.query(`select timezone from public.profiles where id = $1`, [neuf.id])).rows[0].timezone as string;
    noter(17, !!posix.error && !!inconnu.error && !paris.error && tzApres === "Europe/Paris" && tzInscription === "Europe/Paris" && (setPseudo.data ?? []).length > 0 ? "OK" : "ÉCHEC",
      `inscription tz=${tzInscription} ; UTC-9:40 → ${posix.error?.message ?? "ACCEPTÉ"} ; inconnu → ${inconnu.error?.message ?? "ACCEPTÉ"} ; Europe/Paris → ${paris.error?.message ?? "OK"} ; paramètres (pseudo) → ${(setPseudo.data ?? []).length ? "OK" : "ÉCHEC"}`);

    const berlin = await s.client.from("profiles").update({ timezone: "Europe/Berlin" }).eq("id", neuf.id).select("timezone");
    const ny = await s.client.from("profiles").update({ timezone: "America/New_York" }).eq("id", neuf.id).select("timezone");
    const tz18 = (await db.query(`select timezone, timezone_changed_at is not null as pose from public.profiles where id = $1`, [neuf.id])).rows[0];
    noter(18, !berlin.error && !!ny.error && tz18.timezone === "Europe/Berlin" && tz18.pose ? "OK" : "ÉCHEC",
      `1er (Berlin) → ${berlin.error?.message ?? "OK"} ; 2e (New_York) → ${ny.error?.message ?? "ACCEPTÉ"} ; tz=${tz18.timezone}`);

    const ilYa5 = (await db.query(`select ($1::date - 5)::text as d`, [today])).rows[0].d as string;
    const dans5 = (await db.query(`select ($1::date + 5)::text as d`, [today])).rows[0].d as string;
    const rPasse = await inserer({ date_locale: ilYa5 });
    const rFutur = await inserer({ date_locale: dans5 });
    const far = await db.query(
      `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min, difficulte, payload, xp_prevu, statut)
       values ($1, $2, 'daily', 'fitness', $3, 'lot4 loin', '', 10, 'moyen', '{}'::jsonb, 10, 'a_faire') returning id`,
      [neuf.id, dans5, `lot4-far-${randomUUID().slice(0, 8)}`],
    );
    const vFar = await http(s, "POST", `/api/missions/${far.rows[0].id}/valider`, { ressenti: "bien" });
    noter(19, !!rPasse.error && !!rFutur.error && vFar.status >= 400 ? "OK" : "ÉCHEC",
      `il y a 5 j → ${rPasse.error?.message ?? "ACCEPTÉ"} ; dans 5 j → ${rFutur.error?.message ?? "ACCEPTÉ"} ; valider trop lointaine → ${vFar.status} ${vFar.json.error ?? ""}`);

    const posix2 = await s.client.from("profiles").update({ timezone: "UTC-9:40" }).eq("id", neuf.id).select("timezone");
    const kiri = await s.client.from("profiles").update({ timezone: "Pacific/Kiritimati" }).eq("id", neuf.id).select("timezone");
    const bonus: string[] = [];
    for (let i = 0; i < 4; i++) {
      const { data } = await inserer({ duree_min: 60, difficulte: "difficile", payload: { prevue: true, perso: false, niveauMoyen: 4 } });
      if (!data) continue;
      const v = await http(s, "POST", `/api/missions/${data.id}/valider`, { ressenti: "bien" });
      bonus.push(v.status === 200 ? `${v.json.xp}${v.json.plafond ? ` (plafond ${v.json.plafond})` : ""}` : `erreur ${v.status}`);
    }
    const parJour = (await db.query(
      `select public.jour_local(l.created_at, coalesce(nullif(p.timezone, ''), 'Europe/Paris'))::text as jour, coalesce(sum(l.montant), 0)::int as xp
       from public.xp_ledger l join public.profiles p on p.id = l.user_id
       where l.user_id = $1 group by 1`,
      [neuf.id],
    )).rows as { jour: string; xp: number }[];
    const trop = parJour.some((r) => r.xp > 400);
    const tz20 = (await db.query(`select timezone from public.profiles where id = $1`, [neuf.id])).rows[0].timezone;
    noter(20, !!posix2.error && !!kiri.error && !trop && parJour.length > 0 ? "OK" : "ÉCHEC",
      `POSIX → ${posix2.error?.message ?? "ACCEPTÉ"} ; Kiritimati → ${kiri.error?.message ?? "ACCEPTÉ"} ; tz=${tz20} ; extra → +${bonus.join(" / +") || "0"} ; XP/jour local : ${parJour.map((r) => `${r.jour}=${r.xp}`).join(", ")}`);
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
