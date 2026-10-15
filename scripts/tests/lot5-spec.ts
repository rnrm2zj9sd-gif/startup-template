/**
 * Tests du lot 5 contre l'app en route (localhost). Tableau imprimé à la fin.
 *
 *   pnpm dev            (dans un autre terminal)
 *   pnpm test:lot5
 *
 * Les requêtes passent par l'app avec de vraies sessions (clé anon, cookies SSR).
 * DATABASE_URL sert seulement à créer des joueurs temporaires, poser les données
 * de preuve, puis tout nettoyer.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import pg from "pg";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

const BASE = process.env.LOT5_BASE_URL ?? process.env.LOT4_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SKILLS = [
  "musculation",
  "education-financiere",
  "endurance",
  "mobilite",
  "hygiene-de-vie",
  "apprentissage",
] as const;

const NOUVEAUX_ECRANS = ["/domaines", "/competences", "/dashboard/progression", "/journal"];

type Status = "OK" | "ÉCHEC" | "non exécuté";
const rows: { n: number; test: string; result: Status; proof: string }[] = [];
const TESTS = [
  "Sans session, chaque nouvel écran redirige vers /login",
  "La somme des XP des 6 domaines égale l'XP totale du registre",
  "A et B voient chacun leurs propres chiffres, jamais ceux de l'autre",
  "Ajouter puis retirer une compétence fonctionne ; la 6e est refusée ; retirer la dernière est refusé",
  "Une compétence retirée puis réactivée retrouve son niveau et son palier",
  "Le Power affiché égale celui de progression_snapshot",
  "Le journal pagine sans doublon ni trou",
  "Après ajout/retrait, la liste API = user_skill_choices ; Paramètres pointe vers /competences",
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

async function http(s: Session | null, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(s ? { cookie: s.cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, location: res.headers.get("location") ?? "", json };
}

async function creerJoueurNeuf(db: pg.Client, { id, email, password }: { id: string; email: string; password: string }) {
  await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
       extensions.crypt($3, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"pseudo":"Lot5"}', now(), now(),
       '', '', '', '', '', '', '', '')`,
    [id, email, password],
  );
  await db.query(
    `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
     values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
    [id, email],
  );
  await db.query(`update public.profiles set onboarding_done = true, pseudo = 'Lot5' where id = $1`, [id]);
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
  const aCred = { id: idA, email: `lot5-a-${idA.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };
  const bCred = { id: idB, email: `lot5-b-${idB.slice(0, 8)}@themilion.test`, password: randomBytes(18).toString("base64url") };

  try {
    const sans: { path: string; status: number; dest: string }[] = [];
    let tousLogin = true;
    for (const path of NOUVEAUX_ECRANS) {
      const r = await http(null, "GET", path);
      const dest = r.location ? new URL(r.location, BASE).pathname : "";
      const ok = r.status >= 300 && r.status < 400 && dest === "/login";
      if (!ok) tousLogin = false;
      sans.push({ path, status: r.status, dest: dest || "—" });
    }
    noter(
      1,
      tousLogin ? "OK" : "ÉCHEC",
      sans.map((x) => `${x.path} → ${x.status} ${x.dest}`).join(" ; "),
    );

    await creerJoueurNeuf(db, aCred);
    await creerJoueurNeuf(db, bCred);
    const a = await connecter(aCred.email, aCred.password);
    const b = await connecter(bCred.email, bCred.password);

    await db.query(
      `insert into public.xp_ledger (user_id, montant, raison, domaine)
       values
         ($1, 40, 'lot5-a', 'finance'),
         ($1, 25, 'lot5-a', 'fitness'),
         ($1, 10, 'lot5-a', 'mind'),
         ($2, 80, 'lot5-b', 'health')`,
      [idA, idB],
    );

    const progA = await http(a, "GET", "/api/me/progression");
    const progB = await http(b, "GET", "/api/me/progression");
    const xpA = progA.json.xpParDomaine as Record<string, number> | undefined;
    const xpB = progB.json.xpParDomaine as Record<string, number> | undefined;
    const sommeA = xpA ? Object.values(xpA).reduce((n, v) => n + Number(v), 0) : -1;
    const sommeB = xpB ? Object.values(xpB).reduce((n, v) => n + Number(v), 0) : -1;
    const ledgerA = (await db.query(`select coalesce(sum(montant),0)::int as xp from public.xp_ledger where user_id = $1`, [idA])).rows[0].xp as number;
    const ledgerB = (await db.query(`select coalesce(sum(montant),0)::int as xp from public.xp_ledger where user_id = $1`, [idB])).rows[0].xp as number;
    const sixCles = xpA && ["finance", "mind", "health", "fitness", "discipline", "life"].every((d) => d in xpA);

    noter(
      2,
      progA.status === 200 && sixCles && sommeA === ledgerA && ledgerA === 75 ? "OK" : "ÉCHEC",
      `GET A xpTotal=${progA.json.xpTotal} somme domaines=${sommeA} registre=${ledgerA} ; clés=${xpA ? Object.keys(xpA).join(",") : "—"}`,
    );

    const aVoitB = Number(xpA?.health ?? 0) === 80 || Number(progA.json.xpTotal) === Number(progB.json.xpTotal);
    const bVoitA = Number(xpB?.finance ?? 0) === 40 || Number(xpB?.fitness ?? 0) === 25;
    noter(
      3,
      progA.status === 200 && progB.status === 200 && !aVoitB && !bVoitA && Number(xpA?.finance) === 40 && Number(xpB?.health) === 80 && sommeB === ledgerB
        ? "OK"
        : "ÉCHEC",
      `A xpTotal=${progA.json.xpTotal} finance=${xpA?.finance} health=${xpA?.health} ; B xpTotal=${progB.json.xpTotal} health=${xpB?.health} finance=${xpB?.finance}`,
    );

    const postSkill = (s: Session, id: string) => http(s, "POST", "/api/me/competences", { competenceId: id });
    const delSkill = (s: Session, id: string) => http(s, "DELETE", "/api/me/competences", { competenceId: id });

    const p1 = await postSkill(a, SKILLS[0]);
    const delDerniere = await delSkill(a, SKILLS[0]);
    const ajouts: number[] = [];
    for (const id of SKILLS.slice(1, 5)) ajouts.push((await postSkill(a, id)).status);
    const p6 = await postSkill(a, SKILLS[5]);
    const getCinq = await http(a, "GET", "/api/me/competences");
    const nCinq = Array.isArray(getCinq.json.actives) ? (getCinq.json.actives as { id: string }[]).length : -1;
    const retrait = await delSkill(a, SKILLS[4]);
    const getApres = await http(a, "GET", "/api/me/competences");
    const idsApres = ((getApres.json.actives as { id: string }[]) ?? []).map((c) => c.id);

    noter(
      4,
      p1.status === 200 && delDerniere.status === 409 && ajouts.every((s) => s === 200) && p6.status === 409 && nCinq === 5 && retrait.status === 200 && !idsApres.includes(SKILLS[4]) && idsApres.length === 4
        ? "OK"
        : "ÉCHEC",
      `1re → ${p1.status} ; retirer la seule → ${delDerniere.status} ${delDerniere.json.error ?? ""} ; +4 → ${ajouts.join("/")} ; 6e → ${p6.status} ${p6.json.error ?? ""} ; actives à 5=${nCinq} ; retrait → ${retrait.status} ; reste ${idsApres.join(",")}`,
    );

    await db.query(
      `insert into public.skill_progress (user_id, competence_id, focus_id, niveau, palier)
       values ($1, 'musculation', 'abdos', 3, 2)
       on conflict (user_id, competence_id, focus_id) do update set niveau = 3, palier = 2`,
      [idA],
    );
    const avant = await http(a, "GET", "/api/me/competences");
    const muscAvant = ((avant.json.actives as { id: string; niveau: number; palier: number }[]) ?? []).find((c) => c.id === "musculation");
    const retiree = await delSkill(a, "musculation");
    const revenant = await postSkill(a, "musculation");
    const apres = await http(a, "GET", "/api/me/competences");
    const muscApres = ((apres.json.actives as { id: string; niveau: number; palier: number }[]) ?? []).find((c) => c.id === "musculation");
    const progressToujours = (
      await db.query(
        `select niveau, palier from public.skill_progress where user_id = $1 and competence_id = 'musculation' and focus_id = 'abdos'`,
        [idA],
      )
    ).rows[0];

    noter(
      5,
      muscAvant?.niveau === 3 && muscAvant?.palier === 2 && retiree.status === 200 && revenant.status === 200 && muscApres?.niveau === 3 && muscApres?.palier === 2 && progressToujours?.niveau === 3
        ? "OK"
        : "ÉCHEC",
      `avant niv ${muscAvant?.niveau}/${muscAvant?.palier} ; retrait → ${retiree.status} ; retour → ${revenant.status} ; après niv ${muscApres?.niveau}/${muscApres?.palier} ; skill_progress=${progressToujours?.niveau}/${progressToujours?.palier}`,
    );

    const snapHttp = await http(a, "GET", "/api/me/progression");
    const rpc = await a.client.rpc("progression_snapshot");
    const rpcPower = (rpc.data as { power?: number } | null)?.power;
    const httpPower = Number(snapHttp.json.power);
    noter(
      6,
      snapHttp.status === 200 && !rpc.error && httpPower === Number(rpcPower) && Number.isFinite(httpPower)
        ? "OK"
        : "ÉCHEC",
      `GET /api/me/progression.power=${httpPower} ; RPC power=${rpcPower ?? rpc.error?.message ?? "—"}`,
    );

    const nJournal = 45;
    for (let i = 0; i < nJournal; i++) {
      await db.query(
        `insert into public.system_log (user_id, type, payload, created_at)
         values ($1, 'lot5', jsonb_build_object('i', $2::int), now() - ($2::int * interval '1 minute'))`,
        [idA, i],
      );
    }
    const attendu = (
      await db.query(
        `select id::text as id from public.system_log where user_id = $1 order by created_at desc, id desc`,
        [idA],
      )
    ).rows.map((r: { id: string }) => r.id);

    const page1 = await http(a, "GET", "/api/me/journal");
    const l1 = ((page1.json.lignes as { id: string }[]) ?? []).map((l) => l.id);
    const c1 = typeof page1.json.nextCursor === "string" ? page1.json.nextCursor : null;
    const page2 = await http(a, "GET", `/api/me/journal?cursor=${encodeURIComponent(c1 ?? "")}`);
    const l2 = ((page2.json.lignes as { id: string }[]) ?? []).map((l) => l.id);
    const c2 = typeof page2.json.nextCursor === "string" ? page2.json.nextCursor : null;
    const page3 = await http(a, "GET", `/api/me/journal?cursor=${encodeURIComponent(c2 ?? "")}`);
    const l3 = ((page3.json.lignes as { id: string }[]) ?? []).map((l) => l.id);
    const vu = [...l1, ...l2, ...l3];
    const setVu = new Set(vu);
    const trou = attendu.slice(0, vu.length).some((id, i) => id !== vu[i]);
    const okJournal =
      page1.status === 200 &&
      l1.length === 20 &&
      l2.length === 20 &&
      vu.length === attendu.length &&
      setVu.size === vu.length &&
      !trou &&
      page3.json.nextCursor == null;

    noter(
      7,
      okJournal ? "OK" : "ÉCHEC",
      `pages ${l1.length}+${l2.length}+${l3.length} (attendu ${attendu.length}) ; doublons=${vu.length - setVu.size} ; trou=${trou} ; next3=${page3.json.nextCursor ?? "null"}`,
    );

    async function idsStore() {
      const { data } = await a.client.from("user_skill_choices").select("competence_id").eq("user_id", idA).order("competence_id");
      return (data ?? []).map((r) => r.competence_id).sort().join(",");
    }
    async function idsApi() {
      const g = await http(a, "GET", "/api/me/competences");
      return ((g.json.actives as { id: string }[]) ?? []).map((c) => c.id).sort().join(",");
    }
    const avant8 = await idsApi();
    const add8 = await postSkill(a, SKILLS[5]);
    const apiApresAdd = await idsApi();
    const storeApresAdd = await idsStore();
    const del8 = await delSkill(a, SKILLS[5]);
    const apiApresDel = await idsApi();
    const storeApresDel = await idsStore();
    const pageParam = await http(a, "GET", "/dashboard/parametres");
    const pageText = await fetch(BASE + "/dashboard/parametres", { headers: { cookie: a.cookie } }).then((r) => r.text());
    const lien = pageText.includes("/competences") && pageText.includes("Gérer mes compétences");
    const ancienBloc = pageText.includes("Enregistrer les compétences");
    noter(
      8,
      add8.status === 200 &&
        del8.status === 200 &&
        apiApresAdd === storeApresAdd &&
        apiApresDel === storeApresDel &&
        apiApresAdd.includes(SKILLS[5]) &&
        !apiApresDel.includes(SKILLS[5]) &&
        apiApresDel === avant8 &&
        pageParam.status === 200 &&
        lien &&
        !ancienBloc
        ? "OK"
        : "ÉCHEC",
      `ajout ${add8.status} API=store (${apiApresAdd === storeApresAdd}) ; retrait ${del8.status} API=store (${apiApresDel === storeApresDel}) ; Paramètres ${pageParam.status} lien=${lien} ancienBloc=${ancienBloc}`,
    );
  } finally {
    await db.query(`delete from auth.users where id = any($1::uuid[])`, [[idA, idB]]);
    const reste = (await db.query(`select count(*)::int as n from public.profiles where id = any($1::uuid[])`, [[idA, idB]])).rows[0].n;
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
