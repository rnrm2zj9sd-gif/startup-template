/**
 * Tests du lot 6A contre l'app en route (localhost). Tableau imprimé à la fin.
 *
 *   pnpm dev
 *   pnpm test:lot6a
 *
 * Les requêtes passent par l'app avec de vraies sessions (clé anon).
 * DATABASE_URL sert à créer les joueurs, lire les preuves, puis tout nettoyer.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import pg from "pg";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

const BASE = process.env.LOT6_BASE_URL ?? process.env.LOT4_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Status = "OK" | "ÉCHEC" | "non exécuté";
const rows: { n: number; test: string; result: Status; proof: string }[] = [];
const TESTS = [
  "Sans session, /catalogue redirige vers /login",
  "Créer compétence, zone et exercice perso, puis le moteur le propose",
  "31e élément, durée 1 ou 31, nom de 61 caractères : refusés",
  "A ne voit ni n'utilise l'exercice perso de B",
  "Durée 999 ou exercice inventé : mission refusée",
  "Mission perso insérée avec perso:false est enregistrée perso:true",
  "3 missions perso + 1 officielle : le perso reste à 60 % du crédité",
  "Un nom <script> s'affiche comme texte",
  "Supprimer un exercice perso garde la mission passée",
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
       '{"provider":"email","providers":["email"]}', '{"pseudo":"Lot6"}', now(), now(),
       '', '', '', '', '', '', '', '')`,
    [id, email, password],
  );
  await db.query(
    `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
     values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
    [id, email],
  );
  await db.query(`update public.profiles set onboarding_done = true, pseudo = 'Lot6' where id = $1`, [id]);
}

type Perso = {
  competences: { id: string; nom: string; domaine: string; focusParSeance: number; focus: unknown[] }[];
  focus: { id: string; competenceId: string; nom: string; recuperationJours: number }[];
  exercices: Record<string, unknown>[];
  epingles: string[];
  masques: string[];
};

async function lire(s: Session): Promise<Perso> {
  const r = await http(s, "GET", "/api/me/catalogue");
  return r.json as unknown as Perso;
}

async function forcer(s: Session, perso: Perso) {
  const { data } = await s.client.from("custom_catalog").select("data").maybeSingle();
  const actuel = (data?.data ?? {}) as Record<string, unknown>;
  return s.client.from("custom_catalog").upsert({
    user_id: s.id,
    data: { materiel: ["aucun"], budgetMinutesJour: 45, joursDisponibles: [0, 1, 2, 3, 4, 5, 6], ...actuel, catalogPerso: perso },
  });
}

function mission(userId: string, date: string, patch: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    date_locale: date,
    type: "daily",
    domaine: "fitness",
    competence_id: "musculation",
    titre: "lot6",
    description: "",
    duree_min: 10,
    difficulte: "moyen",
    payload: { exerciceId: "planche", perso: false },
    xp_prevu: 10,
    statut: "a_faire",
    ...patch,
  };
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

  const idA = randomUUID();
  const idB = randomUUID();
  const idC = randomUUID();
  const aCred = { id: idA, email: `lot6-a-${idA.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };
  const bCred = { id: idB, email: `lot6-b-${idB.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };
  const cCred = { id: idC, email: `lot6-c-${idC.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };
  const ids = [idA, idB, idC];

  try {
    const sans = await http(null, "GET", "/catalogue");
    const dest = sans.location ? new URL(sans.location, BASE).pathname : "";
    noter(1, sans.status >= 300 && sans.status < 400 && dest === "/login" ? "OK" : "ÉCHEC", `/catalogue → ${sans.status} ${dest || "—"}`);

    await creerJoueurNeuf(db, aCred);
    await creerJoueurNeuf(db, bCred);
    await creerJoueurNeuf(db, cCred);
    const a = await connecter(aCred.email, aCred.password, idA);
    const b = await connecter(bCred.email, bCred.password, idB);
    const c = await connecter(cCred.email, cCred.password, idC);
    const today = (await db.query(`select public.jour_local(now(), 'Europe/Paris')::text as d`)).rows[0].d as string;

    const comp = await http(a, "POST", "/api/me/catalogue", { kind: "competence", nom: "Souffle", domaine: "fitness" });
    const apresComp = await lire(a);
    const competenceId = apresComp.competences?.[0]?.id;
    const zone = await http(a, "POST", "/api/me/catalogue", { kind: "zone", nom: "Côtes", competenceId });
    const apresZone = await lire(a);
    const focusId = apresZone.focus?.[0]?.id;
    const exo = await http(a, "POST", "/api/me/catalogue", {
      kind: "exercice",
      nom: "Respiration carrée",
      competenceId,
      focusId,
      consigne: "Inspire 4 s, bloque 4 s, expire 4 s.",
      duree: 10,
      difficulte: "moyen",
      materiel: "aucun",
      lien: "https://example.com/souffle",
    });
    const apresExo = await lire(a);
    const exerciceId = apresExo.exercices?.[0]?.id as string | undefined;
    const choix = exerciceId
      ? await a.client.from("user_skill_choices").insert({
          user_id: idA,
          competence_id: competenceId,
          focus_ids: [focusId],
          seances_semaine: 7,
          minutes_max: 10,
          mode: "guide",
        })
      : { error: { message: "exercice absent" } };
    const gen = await http(a, "POST", "/api/missions/generer");
    const missions = (gen.json.missions ?? []) as { payload?: { exerciceIds?: string[]; seance?: { exercices?: { exerciceId: string }[] } } }[];
    const propose = missions.some((m) => {
      const idsExo = m.payload?.exerciceIds ?? m.payload?.seance?.exercices?.map((e) => e.exerciceId) ?? [];
      return exerciceId ? idsExo.includes(exerciceId) : false;
    });
    noter(
      2,
      comp.status === 200 && zone.status === 200 && exo.status === 200 && !choix.error && gen.status === 200 && propose ? "OK" : "ÉCHEC",
      `compétence ${comp.status}, zone ${zone.status}, exercice ${exo.status} (${exerciceId ?? "—"}) ; choix ${choix.error?.message ?? "ok"} ; générer ${gen.status} ${gen.json.error ?? ""} ; proposé=${propose}`,
    );

    const nomLong = "N".repeat(61);
    const rNom = await forcer(a, {
      ...apresExo,
      competences: [...(apresExo.competences ?? []), { id: "perso-nom-long", nom: nomLong, domaine: "Physique", focusParSeance: 1, focus: [] }],
    });
    const r1 = await forcer(a, {
      ...apresExo,
      exercices: [...(apresExo.exercices ?? []), { id: "perso-d1", nom: "Trop court", competenceId, focusId, difficulte: "moyen", mesure: "minutes", valeur: 1, progression: false }],
    });
    const r31 = await forcer(a, {
      ...apresExo,
      exercices: [...(apresExo.exercices ?? []), { id: "perso-d31", nom: "Trop long", competenceId, focusId, difficulte: "moyen", mesure: "minutes", valeur: 31, progression: false }],
    });
    const plein: Perso = {
      competences: Array.from({ length: 30 }, (_, i) => ({ id: `perso-plein-${i}`, nom: `Plein ${i}`, domaine: "Physique", focusParSeance: 1, focus: [] })),
      focus: [],
      exercices: [],
      epingles: [],
      masques: [],
    };
    const r30 = await forcer(a, plein);
    const r31e = await forcer(a, {
      ...plein,
      competences: [...plein.competences, { id: "perso-31", nom: "En trop", domaine: "Physique", focusParSeance: 1, focus: [] }],
    });
    const reste = await lire(a);
    noter(
      3,
      !!rNom.error && !!r1.error && !!r31.error && !r30.error && !!r31e.error && (reste.competences?.length ?? 0) === 30 ? "OK" : "ÉCHEC",
      `nom 61 → ${rNom.error?.message ?? "ACCEPTÉ"} ; 1 min → ${r1.error?.message ?? "ACCEPTÉ"} ; 31 min → ${r31.error?.message ?? "ACCEPTÉ"} ; 30 → ${r30.error?.message ?? "ok"} ; 31e → ${r31e.error?.message ?? "ACCEPTÉ"} ; en base ${reste.competences?.length ?? 0}`,
    );

    const exoB = await http(b, "POST", "/api/me/catalogue", { kind: "competence", nom: "Secret B", domaine: "mind" });
    const catB = await lire(b);
    const idCompB = catB.competences?.[0]?.id;
    await http(b, "POST", "/api/me/catalogue", { kind: "zone", nom: "Zone B", competenceId: idCompB });
    const catB2 = await lire(b);
    const idZoneB = catB2.focus?.[0]?.id;
    const creerB = await http(b, "POST", "/api/me/catalogue", {
      kind: "exercice", nom: "Exercice secret", competenceId: idCompB, focusId: idZoneB, consigne: "Rien.", duree: 8, difficulte: "facile",
    });
    const secret = (await lire(b)).exercices?.[0]?.id as string;
    const vueA = await http(a, "GET", "/api/me/catalogue");
    const ligneA = await a.client.from("custom_catalog").select("data").eq("user_id", idB);
    const usage = await a.client.from("missions").insert(mission(idA, today, {
      competence_id: idCompB,
      duree_min: 8,
      difficulte: "facile",
      payload: { exerciceId: secret, perso: false },
      titre: "vol",
    })).select("id");
    const texteA = JSON.stringify(vueA.json);
    noter(
      4,
      exoB.status === 200 && creerB.status === 200 && !texteA.includes(secret) && (ligneA.data ?? []).length === 0 && !!usage.error ? "OK" : "ÉCHEC",
      `B crée ${creerB.status} ${secret} ; API de A contient l'id : ${texteA.includes(secret)} ; lecture base de la ligne de B : ${(ligneA.data ?? []).length} ; usage → ${usage.error?.message ?? "ACCEPTÉ"}`,
    );

    const refus999 = await c.client.from("missions").insert(mission(idC, today, { duree_min: 999 })).select("id");
    const refusInvente = await c.client.from("missions").insert(mission(idC, today, { payload: { exerciceId: "invente-lot6" } })).select("id");
    noter(
      5,
      !!refus999.error && !!refusInvente.error ? "OK" : "ÉCHEC",
      `999 min → ${refus999.error?.message ?? "ACCEPTÉ"} ; inventé → ${refusInvente.error?.message ?? "ACCEPTÉ"}`,
    );

    const compC = await http(c, "POST", "/api/me/catalogue", { kind: "competence", nom: "Cap C", domaine: "fitness" });
    const catC = await lire(c);
    const compCId = catC.competences?.[0]?.id;
    await http(c, "POST", "/api/me/catalogue", { kind: "zone", nom: "Zone C", competenceId: compCId });
    const catC2 = await lire(c);
    const zoneC = catC2.focus?.[0]?.id;
    await http(c, "POST", "/api/me/catalogue", {
      kind: "exercice", nom: "Gainage perso", competenceId: compCId, focusId: zoneC, consigne: "Tiens.", duree: 20, difficulte: "moyen",
    });
    const exoC = (await lire(c)).exercices?.[0]?.id as string;
    const insere = await c.client.from("missions").insert(mission(idC, today, {
      competence_id: compCId,
      titre: "perso forcé",
      duree_min: 20,
      difficulte: "moyen",
      payload: { exerciceId: exoC, perso: false, prevue: true, niveauMoyen: 1 },
    })).select("id, payload").single();
    const flag = (insere.data?.payload as { perso?: boolean; prevue?: boolean } | undefined)?.perso;
    const prevu = (insere.data?.payload as { prevue?: boolean } | undefined)?.prevue;
    noter(
      6,
      !insere.error && flag === true && prevu === false ? "OK" : "ÉCHEC",
      `insert ${insere.error?.message ?? insere.data?.id} ; perso envoyé false, lu ${String(flag)} ; prevue lu ${String(prevu)}`,
    );

    const officiel = await c.client.from("missions").insert(mission(idC, today, {
      titre: "officiel",
      duree_min: 20,
      payload: { exerciceId: "planche", perso: true },
    })).select("id").single();
    const persoIds = [insere.data?.id].filter(Boolean) as string[];
    const erreursInsert: string[] = [];
    for (let i = 0; i < 2; i++) {
      const nom = `Cap C ${i + 2}`;
      const cree = await http(c, "POST", "/api/me/catalogue", { kind: "competence", nom, domaine: "fitness" });
      const cat = await lire(c);
      const cid = cat.competences?.find((x) => x.nom === nom)?.id;
      const z = await http(c, "POST", "/api/me/catalogue", { kind: "zone", nom: `Zone ${nom}`, competenceId: cid });
      const catZ = await lire(c);
      const zid = catZ.focus?.find((f) => f.nom === `Zone ${nom}`)?.id;
      const ex = await http(c, "POST", "/api/me/catalogue", {
        kind: "exercice", nom: `Gainage ${nom}`, competenceId: cid, focusId: zid, consigne: "Tiens.", duree: 20, difficulte: "moyen",
      });
      const eid = (await lire(c)).exercices?.find((e) => e.nom === `Gainage ${nom}`)?.id as string | undefined;
      const row = eid
        ? await c.client.from("missions").insert(mission(idC, today, {
            competence_id: cid,
            titre: `perso ${i + 2}`,
            duree_min: 20,
            payload: { exerciceId: eid, perso: false },
          })).select("id").single()
        : { data: null, error: { message: `exercice absent (${cree.status}/${z.status}/${ex.status})` } };
      if (row.data?.id) persoIds.push(row.data.id);
      else erreursInsert.push(row.error?.message ?? "insert vide");
    }
    const valOff = officiel.data?.id
      ? await c.client.rpc("validate_mission", { p_mission_id: officiel.data.id, p_ressenti: "bien", p_note: "" })
      : { data: null, error: { message: "officielle absente" } };
    const vals = [];
    for (const id of persoIds) {
      vals.push(await c.client.rpc("validate_mission", { p_mission_id: id, p_ressenti: "bien", p_note: "" }));
    }
    const sommes = await db.query(
      `select coalesce(sum(montant) filter (where raison = 'mission_perso'), 0)::int as perso,
              coalesce(sum(montant), 0)::int as total
       from public.xp_ledger
       where user_id = $1 and public.jour_local(created_at, 'Europe/Paris') = $2::date`,
      [idC, today],
    );
    const persoXp = sommes.rows[0].perso as number;
    const totalXp = sommes.rows[0].total as number;
    const sous = totalXp > 0 && persoXp * 5 <= totalXp * 3;
    noter(
      7,
      compC.status === 200 && !valOff.error && persoIds.length === 3 && sous ? "OK" : "ÉCHEC",
      `officielle +${(valOff.data as { xp?: number } | null)?.xp ?? valOff.error?.message} ; perso ${vals.map((v) => (v.data as { xp?: number } | null)?.xp ?? v.error?.message).join(" / ")}${erreursInsert.length ? ` ; inserts ${erreursInsert.join(", ")}` : ""} ; crédité perso ${persoXp} / total ${totalXp} (${totalXp ? Math.round((persoXp / totalXp) * 100) : 0} %)`,
    );

    await forcer(a, {
      competences: [],
      focus: [],
      exercices: [],
      epingles: [],
      masques: [],
    });
    const xssComp = await http(a, "POST", "/api/me/catalogue", { kind: "competence", nom: "Texte", domaine: "life" });
    const xssCat = await lire(a);
    const xssCompId = xssCat.competences?.[0]?.id;
    await http(a, "POST", "/api/me/catalogue", { kind: "zone", nom: "Zone texte", competenceId: xssCompId });
    const xssCat2 = await lire(a);
    const xssZone = xssCat2.focus?.[0]?.id;
    const nomScript = "<script>alert(1)</script>";
    const xss = await http(a, "POST", "/api/me/catalogue", {
      kind: "exercice", nom: nomScript, competenceId: xssCompId, focusId: xssZone, consigne: "Lis.", duree: 6, difficulte: "facile",
    });
    const page = await http(a, "GET", "/catalogue");
    const sansScripts = page.text.replace(/<script[\s\S]*?<\/script>/gi, "");
    const echappe = sansScripts.includes("&lt;script&gt;alert(1)&lt;/script&gt;");
    const executable = /<script>\s*alert\(1\)\s*<\/script>/i.test(sansScripts);
    noter(
      8,
      xssComp.status === 200 && xss.status === 200 && page.status === 200 && echappe && !executable ? "OK" : "ÉCHEC",
      `création ${xss.status} ; page ${page.status} ; échappé=${echappe} ; balise exécutable hors script=${executable}`,
    );

    const idScript = (await lire(a)).exercices?.find((e) => e.nom === nomScript)?.id as string;
    const gardee = await a.client.from("missions").insert(mission(idA, today, {
      competence_id: xssCompId,
      titre: "Mission gardée",
      duree_min: 6,
      difficulte: "facile",
      payload: { exerciceId: idScript, perso: false },
    })).select("id, titre").single();
    const suppression = gardee.data?.id
      ? await http(a, "DELETE", "/api/me/catalogue", { kind: "exercice", id: idScript })
      : { status: 0 };
    const apres = gardee.data?.id
      ? await a.client.from("missions").select("id, titre, statut").eq("id", gardee.data.id).maybeSingle()
      : { data: null };
    const encore = (await lire(a)).exercices?.some((e) => e.id === idScript);
    noter(
      9,
      suppression.status === 200 && apres.data?.titre === "Mission gardée" && encore === false ? "OK" : "ÉCHEC",
      `mission ${gardee.error?.message ?? gardee.data?.id} ; suppression ${suppression.status} ; titre après « ${apres.data?.titre ?? "—"} » ; exercice encore dans le catalogue : ${encore}`,
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
