/**
 * Tests du lot 6B (modes + durcissement du délai).
 *
 *   pnpm dev
 *   pnpm test:lot6b
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import pg from "pg";
import { CATALOGUE, etatInitial, fusionnerCatalogue, planifierSemaine, type CataloguePerso } from "../../lib/moteur";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

const BASE = process.env.LOT6_BASE_URL ?? process.env.LOT4_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Status = "OK" | "ÉCHEC" | "non exécuté";
const rows: { n: number; test: string; result: Status; proof: string }[] = [];
const TESTS = [
  "Le mode se change et ne s'applique qu'à partir de demain",
  "UPDATE de mode_depuis puis RPC : le client ne saute pas le délai",
  "DELETE+INSERT d'une compétence : le nouveau mode attend demain",
  "Changement de mode à 00h30 Paris, effectif le jour local suivant",
  "Un exercice masqué n'est jamais proposé en 30 générations ; un épinglé apparaît",
  "Remplacer : même zone seulement ; 4e du jour refusée",
  "Remplacer : mission d'un autre joueur 403 ; déjà faite 409",
  "Libre : ajouter fonctionne ; prévue seulement pour demain ; plafond 400",
  "Libre : durée hors plage, perso d'autrui, 3e fois du même exercice refusés",
  "A et B ne voient jamais les préférences de l'autre ; la 51e est refusée",
];

function noter(n: number, result: Status, proof: string) {
  rows.push({ n, test: TESTS[n - 1], result, proof });
}

type Session = { cookie: string; client: ReturnType<typeof createServerClient>; id: string };

async function connecter(email: string, password: string, id: string): Promise<Session> {
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
    id,
    client,
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function http(s: Session | null, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(s ? { cookie: s.cookie } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, location: res.headers.get("location") ?? "", json, text };
}

async function creerJoueurNeuf(db: pg.Client, { id, email, password }: { id: string; email: string; password: string }) {
  await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
       extensions.crypt($3, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"pseudo":"Lot6b","gender":"male"}', now(), now(),
       '', '', '', '', '', '', '', '')`,
    [id, email, password],
  );
  await db.query(
    `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
     values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
    [id, email],
  );
  await db.query(`update public.profiles set onboarding_done = true, pseudo = 'Lot6b', timezone = 'Europe/Paris' where id = $1`, [id]);
}

function motDePasse() {
  return `L6b-${randomBytes(6).toString("hex")}A1`;
}

async function main() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const idA = randomUUID();
  const idB = randomUUID();
  const ids = [idA, idB];
  const passA = motDePasse();
  const passB = motDePasse();
  const emailA = `lot6b-a-${idA.slice(0, 8)}@example.test`;
  const emailB = `lot6b-b-${idB.slice(0, 8)}@example.test`;

  try {
    await creerJoueurNeuf(db, { id: idA, email: emailA, password: passA });
    await creerJoueurNeuf(db, { id: idB, email: emailB, password: passB });
    const a = await connecter(emailA, passA, idA);
    const b = await connecter(emailB, passB, idB);

    const choix = { focus_ids: [] as string[], seances_semaine: 3, minutes_max: 20, mode: "guide" };
    const addA1 = await a.client.from("user_skill_choices").insert({ user_id: idA, competence_id: "musculation", ...choix });
    const addA2 = await a.client.from("user_skill_choices").insert({ user_id: idA, competence_id: "endurance", ...choix });
    const addB = await b.client.from("user_skill_choices").insert({ user_id: idB, competence_id: "musculation", ...choix });
    if (addA1.error || addA2.error || addB.error) {
      throw new Error(`choix : ${addA1.error?.message ?? addA2.error?.message ?? addB.error?.message}`);
    }

    const jourRow = await db.query<{ d: string }>(
      `select public.jour_local(now(), 'Europe/Paris')::text as d`,
    );
    const jour = jourRow.rows[0].d;
    const demain = (await db.query<{ d: string }>(`select ($1::date + 1)::text as d`, [jour])).rows[0].d;

    const patch = await http(a, "PATCH", "/api/me/competences", { competenceId: "musculation", mode: "mixte" });
    const apresPatch = await db.query<{ mode: string; mode_en_vigueur: string; mode_depuis: string }>(
      `select mode, mode_en_vigueur, mode_depuis::text from public.user_skill_choices where user_id = $1 and competence_id = 'musculation'`,
      [idA],
    );
    const m1 = apresPatch.rows[0];
    noter(
      1,
      patch.status === 200 && m1?.mode === "mixte" && m1.mode_en_vigueur === "guide" && m1.mode_depuis === demain ? "OK" : "ÉCHEC",
      `PATCH ${patch.status} ${String(patch.json.error ?? "")} ; mode=${m1?.mode} vigueur=${m1?.mode_en_vigueur} depuis=${m1?.mode_depuis} (demain ${demain})`,
    );

    const updDepuis = await a.client.from("user_skill_choices").update({ mode_depuis: "2020-01-01" }).eq("competence_id", "musculation").select("mode_depuis");
    const updVigueur = await a.client.from("user_skill_choices").update({ mode_en_vigueur: "mixte" }).eq("competence_id", "musculation").select("mode_en_vigueur");
    await a.client.rpc("appliquer_modes_du_jour");
    const apresRpc = await db.query<{ mode_en_vigueur: string; mode_depuis: string }>(
      `select mode_en_vigueur, mode_depuis::text from public.user_skill_choices where user_id = $1 and competence_id = 'musculation'`,
      [idA],
    );
    noter(
      2,
      Boolean(updDepuis.error) && Boolean(updVigueur.error) && apresRpc.rows[0]?.mode_en_vigueur === "guide" && apresRpc.rows[0]?.mode_depuis === demain
        ? "OK"
        : "ÉCHEC",
      `mode_depuis ${updDepuis.error?.message ?? "écrit"} ; mode_en_vigueur ${updVigueur.error?.message ?? "écrit"} ; après RPC vigueur=${apresRpc.rows[0]?.mode_en_vigueur} depuis=${apresRpc.rows[0]?.mode_depuis}`,
    );

    const del = await a.client.from("user_skill_choices").delete().eq("competence_id", "endurance");
    const ins = await a.client.from("user_skill_choices").insert({
      user_id: idA,
      competence_id: "endurance",
      focus_ids: [],
      seances_semaine: 3,
      minutes_max: 20,
      mode: "libre",
    }).select("mode, mode_en_vigueur, mode_depuis");
    await a.client.rpc("appliquer_modes_du_jour");
    const re = await db.query<{ mode: string; mode_en_vigueur: string; mode_depuis: string }>(
      `select mode, mode_en_vigueur, mode_depuis::text from public.user_skill_choices where user_id = $1 and competence_id = 'endurance'`,
      [idA],
    );
    noter(
      3,
      !del.error && !ins.error && re.rows[0]?.mode === "libre" && re.rows[0]?.mode_en_vigueur === "guide" && re.rows[0]?.mode_depuis === demain
        ? "OK"
        : "ÉCHEC",
      `delete ${del.error?.message ?? "ok"} ; insert ${ins.error?.message ?? "ok"} ; mode=${re.rows[0]?.mode} vigueur=${re.rows[0]?.mode_en_vigueur} depuis=${re.rows[0]?.mode_depuis}`,
    );

    const def = await db.query<{ d: string }>(`select pg_get_functiondef('public._skill_choices_mode_demain()'::regprocedure) as d`);
    const src = def.rows[0]?.d ?? "";
    const formule = await db.query<{ paris: string; utc1: string; local1: string }>(
      `select public.jour_local('2026-10-15 22:30:00+00'::timestamptz, 'Europe/Paris')::text as paris,
              (date '2026-10-15' + 1)::text as utc1,
              (public.jour_local('2026-10-15 22:30:00+00'::timestamptz, 'Europe/Paris') + 1)::text as local1`,
    );
    const f = formule.rows[0];
    noter(
      4,
      src.includes("jour_local") && !src.includes("current_date") && f.paris === "2026-10-16" && f.utc1 === "2026-10-16" && f.local1 === "2026-10-17" && m1?.mode_depuis === demain
        ? "OK"
        : "ÉCHEC",
      `00h30 Paris → ${f.paris} ; current_date+1=${f.utc1} ; jour_local+1=${f.local1} ; PATCH depuis=${m1.mode_depuis} ; trigger jour_local=${src.includes("jour_local")}`,
    );

    const catalogue: CataloguePerso = {
      competences: [],
      focus: [],
      exercices: [],
      epingles: ["crunch"],
      masques: ["planche"],
    };
    const fusion = fusionnerCatalogue(CATALOGUE, catalogue);
    let vuMasque = false;
    let vuEpingle = false;
    for (let i = 0; i < 30; i++) {
      const date = `2026-01-${String((i % 28) + 1).padStart(2, "0")}`;
      const plan = planifierSemaine(
        {
          userId: `lot6b-gen-${i}`,
          materiel: ["aucun"],
          budgetMinutesJour: 45,
          joursDisponibles: [0, 1, 2, 3, 4, 5, 6],
          choix: [{ competenceId: "musculation", focusIds: ["abdos"], seancesParSemaine: 7, minutesMax: 20, mode: "mixte" }],
          catalogPerso: catalogue,
        },
        etatInitial(),
        fusion,
        date,
      );
      const idsEx = plan.flatMap((j) => j.seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)));
      if (idsEx.includes("planche")) vuMasque = true;
      if (idsEx.includes("crunch")) vuEpingle = true;
    }
    noter(5, !vuMasque && vuEpingle ? "OK" : "ÉCHEC", `masqué vu=${vuMasque} ; épinglé vu=${vuEpingle} (30 générations)`);

    await db.query(
      `update public.user_skill_choices set mode = 'mixte', mode_en_vigueur = 'mixte', mode_depuis = $2 where user_id = $1 and competence_id = 'musculation'`,
      [idA, jour],
    );
    const exoA = (CATALOGUE.musculation?.exercices ?? []).filter((e) => e.focusId === "abdos" && e.materiel.includes("aucun"));
    const premier = exoA[0];
    const autreMemeZone = exoA.find((e) => e.id !== premier?.id);
    const autreZone = (CATALOGUE.musculation?.exercices ?? []).find((e) => e.focusId !== "abdos" && e.materiel.includes("aucun"));
    const missionIns = await db.query<{ id: string }>(
      `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min, difficulte, payload, xp_prevu, statut)
       values ($1, $2::date, 'daily', 'fitness', 'musculation', 'Test remplacer', 'x', 10, 'facile',
         jsonb_build_object('exerciceId', $3::text, 'focusIds', jsonb_build_array('abdos'), 'source', 'moteur'),
         16, 'a_faire') returning id`,
      [idA, jour, premier?.id],
    );
    const missionId0 = missionIns.rows[0]?.id;
    const remplaceOk = await http(a, "POST", `/api/missions/${missionId0}/remplacer`, { exerciceId: autreMemeZone?.id });
    const remplaceHors = await http(a, "POST", `/api/missions/${(remplaceOk.json.mission as { id?: string } | undefined)?.id ?? missionId0}/remplacer`, {
      exerciceId: autreZone?.id,
    });
    let nRemp = 1;
    let dernierId = (remplaceOk.json.mission as { id?: string } | undefined)?.id ?? missionId0;
    let quatrieme = { status: 0, json: {} as Record<string, unknown> };
    while (nRemp < 4 && dernierId) {
      const courant = (await db.query<{ x: string }>(`select payload->>'exerciceId' as x from public.missions where id = $1`, [dernierId])).rows[0]?.x;
      const alt = exoA.find((e) => e.id !== courant);
      const r = await http(a, "POST", `/api/missions/${dernierId}/remplacer`, { exerciceId: alt?.id ?? autreMemeZone?.id });
      nRemp += 1;
      if (nRemp === 4) quatrieme = r;
      dernierId = (r.json.mission as { id?: string } | undefined)?.id ?? dernierId;
    }
    noter(
      6,
      remplaceOk.status === 200 && remplaceHors.status === 400 && quatrieme.status === 409 ? "OK" : "ÉCHEC",
      `même zone ${remplaceOk.status} ; hors zone ${remplaceHors.status} ${String(remplaceHors.json.error ?? "")} ; 4e ${quatrieme.status} ${String(quatrieme.json.error ?? "")}`,
    );

    const missionB = await db.query<{ id: string }>(
      `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min, difficulte, payload, xp_prevu, statut)
       values ($1, $2::date, 'daily', 'fitness', 'musculation', 'Chez B', 'x', 10, 'facile',
         jsonb_build_object('exerciceId', $3::text, 'focusIds', jsonb_build_array('abdos'), 'source', 'moteur'),
         16, 'a_faire') returning id`,
      [idB, jour, premier?.id],
    );
    const vol = await http(a, "POST", `/api/missions/${missionB.rows[0]?.id}/remplacer`, { exerciceId: autreMemeZone?.id });
    const faite = await db.query<{ id: string }>(
      `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, description, duree_min, difficulte, payload, xp_prevu, statut)
       values ($1, $2::date, 'daily', 'fitness', 'endurance', 'Déjà faite', 'x', 10, 'facile',
         jsonb_build_object('exerciceId', 'footing', 'source', 'moteur'),
         16, 'terminee') returning id`,
      [idA, jour],
    );
    const deja = await http(a, "POST", `/api/missions/${faite.rows[0]?.id}/remplacer`, { exerciceId: "footing" });
    noter(
      7,
      vol.status === 403 && deja.status === 409 ? "OK" : "ÉCHEC",
      `autrui ${vol.status} ${String(vol.json.error ?? "")} ; faite ${deja.status} ${String(deja.json.error ?? "")}`,
    );

    await db.query(
      `update public.user_skill_choices set mode = 'libre', mode_en_vigueur = 'libre', mode_depuis = $2 where user_id = $1 and competence_id = 'endurance'`,
      [idA, jour],
    );
    const exoLibre = (CATALOGUE.endurance?.exercices ?? []).find((e) => e.id === "marche-rapide") ?? (CATALOGUE.endurance?.exercices ?? [])[0];
    const addToday = await http(a, "POST", "/api/missions/ajouter", { exerciceId: exoLibre?.id, duree: 10, date: jour });
    const addDemain = await http(a, "POST", "/api/missions/ajouter", { exerciceId: exoLibre?.id, duree: 10, date: demain });
    const prevueToday = (addToday.json.mission as { payload?: { prevue?: boolean } } | undefined)?.payload?.prevue ?? addToday.json.prevue;
    const prevueDemain = (addDemain.json.mission as { payload?: { prevue?: boolean } } | undefined)?.payload?.prevue ?? addDemain.json.prevue;
    await db.query(
      `insert into public.xp_ledger (user_id, montant, raison, domaine) values ($1, 390, 'test plafond', 'fitness')`,
      [idA],
    );
    const addId = (addToday.json.mission as { id?: string } | undefined)?.id;
    let plafondOk = false;
    let xpVal = -1;
    if (addId) {
      const { data: val } = await a.client.rpc("validate_mission", { p_mission_id: addId, p_ressenti: "bien" });
      xpVal = (val as { xp?: number } | null)?.xp ?? -1;
      const total = await db.query<{ n: number }>(
        `select coalesce(sum(montant),0)::int as n from public.xp_ledger where user_id = $1 and public.jour_local(created_at, 'Europe/Paris') = $2::date`,
        [idA, jour],
      );
      plafondOk = xpVal >= 0 && xpVal <= 10 && total.rows[0].n <= 400;
    }
    noter(
      8,
      addToday.status === 200 && addDemain.status === 200 && prevueToday === false && prevueDemain === true && plafondOk ? "OK" : "ÉCHEC",
      `aujourd'hui ${addToday.status} prevue=${prevueToday} ; demain ${addDemain.status} prevue=${prevueDemain} ; xp validé=${xpVal} plafond400=${plafondOk}`,
    );

    const hors = await http(a, "POST", "/api/missions/ajouter", { exerciceId: exoLibre?.id, duree: 999, date: jour });
    const persoB = {
      competences: [],
      focus: [],
      exercices: [{ id: "perso-b-secret", nom: "Secret B", competenceId: "musculation", focusId: "abdos", difficulte: "facile", mesure: "minutes", valeur: 10 }],
      epingles: [],
      masques: [],
    };
    await b.client.from("custom_catalog").upsert({
      user_id: idB,
      data: { materiel: ["aucun"], budgetMinutesJour: 45, joursDisponibles: [0, 1, 2, 3, 4, 5, 6], catalogPerso: persoB },
    });
    const volPerso = await http(a, "POST", "/api/missions/ajouter", { exerciceId: "perso-b-secret", duree: 10, date: jour });
    const encore1 = await http(a, "POST", "/api/missions/ajouter", { exerciceId: exoLibre?.id, duree: 10, date: jour });
    const encore2 = await http(a, "POST", "/api/missions/ajouter", { exerciceId: exoLibre?.id, duree: 10, date: jour });
    noter(
      9,
      hors.status === 400 && volPerso.status === 403 && encore1.status === 200 && encore2.status === 409 ? "OK" : "ÉCHEC",
      `hors plage ${hors.status} ; perso autrui ${volPerso.status} ; 2e ${encore1.status} ; 3e ${encore2.status} ${String(encore2.json.error ?? "")}`,
    );

    const prefA = await http(a, "POST", "/api/me/prefs", { exerciceId: "crunch", kind: "epingle" });
    const prefB = await http(b, "POST", "/api/me/prefs", { exerciceId: "planche", kind: "masque" });
    const litA = await a.client.from("exercice_prefs").select("exercice_id, kind");
    const litBchezA = await a.client.from("exercice_prefs").select("exercice_id").eq("exercice_id", "planche");
    let ok50 = true;
    for (let i = 0; i < 49; i++) {
      const r = await a.client.from("exercice_prefs").upsert({ user_id: idA, exercice_id: `exo-limite-${i}`, kind: "masque" });
      if (r.error) ok50 = false;
    }
    const p51 = await a.client.from("exercice_prefs").insert({ user_id: idA, exercice_id: "exo-limite-50", kind: "masque" });
    noter(
      10,
      prefA.status === 200 && prefB.status === 200 && (litA.data?.every((p: { exercice_id: string }) => p.exercice_id !== "planche") ?? false) && (litBchezA.data?.length ?? 1) === 0 && ok50 && Boolean(p51.error)
        ? "OK"
        : "ÉCHEC",
      `A ${prefA.status} B ${prefB.status} ; A voit B=${litBchezA.data?.length ?? "?"} ; 51e ${p51.error?.message ?? "acceptée"}`,
    );
  } finally {
    await db.query(`delete from auth.users where id = any($1::uuid[])`, [ids]);
    const reste = (await db.query(`select count(*)::int as n from public.profiles where id = any($1::uuid[])`, [ids])).rows[0].n;
    console.log(`Nettoyage : joueurs temporaires supprimés (profils restants : ${reste}).`);
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
