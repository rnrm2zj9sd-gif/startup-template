import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import pg from "pg";

const EMAIL_E2E = /^e2e\+\d+-[a-z0-9]+@example\.test$/;
const REF_TEST = "wpiyjbdsrmgadjosbhvw";
const REF_PROD = "kazdyhxetsevlpxexmof";

function lireFichierEnv(fichier: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(resolve(process.cwd(), fichier), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Si .env.test existe, lui seul est lu (une valeur vide n'est jamais complétée). Sinon .env.local, sans écraser l'environnement déjà défini. */
export function chargerEnv() {
  const test = resolve(process.cwd(), ".env.test");
  if (existsSync(test)) {
    for (const [key, value] of Object.entries(lireFichierEnv(".env.test"))) {
      process.env[key] = value;
    }
    return;
  }
  const local = resolve(process.cwd(), ".env.local");
  if (!existsSync(local)) return;
  for (const [key, value] of Object.entries(lireFichierEnv(".env.local"))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function refDansJwt(cle: string): string | null {
  const parts = cle.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

/** Lève une erreur si l'URL, la base ou la clé service ne visent pas le projet de test. */
export function verifierCibleTest() {
  for (const nom of ["NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL"] as const) {
    const valeur = process.env[nom] ?? "";
    if (!valeur.includes(REF_TEST) || valeur.includes(REF_PROD)) {
      throw new Error(`${nom} ne vise pas le projet de test.`);
    }
  }
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!cle || cle.includes(REF_PROD)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ne vise pas le projet de test.");
  }
  const ref = refDansJwt(cle);
  if (ref !== null) {
    if (ref !== REF_TEST) throw new Error("SUPABASE_SERVICE_ROLE_KEY ne vise pas le projet de test.");
  } else if (!cle.includes(REF_TEST)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ne vise pas le projet de test.");
  }
}

chargerEnv();

function requis(nom: string): string {
  const valeur = process.env[nom]?.trim();
  if (!valeur) throw new Error(`${nom} manquante (fichier .env.test ou .env.local, jamais dans le dépôt).`);
  return valeur;
}

let client: SupabaseClient | null = null;
let sql: pg.Client | null = null;

function cleService(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

/** Client admin : la clé service role reste dans le process de test. */
export function admin(): SupabaseClient {
  const cle = cleService();
  if (!cle) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (fichier .env.test ou .env.local, jamais dans le dépôt).");
  if (!client) {
    client = createClient(requis("NEXT_PUBLIC_SUPABASE_URL"), cle, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

async function base(): Promise<pg.Client> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante, et DATABASE_URL absente pour le repli local.");
  }
  if (!sql) {
    sql = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      statement_timeout: 30_000,
      connectionTimeoutMillis: 20_000,
    });
    await sql.connect();
  }
  return sql;
}

export function emailE2E(): string {
  const alea = Math.random().toString(36).slice(2, 8);
  return `e2e+${Date.now()}-${alea}@example.test`;
}

export function motDePasseE2E(): string {
  return `E2e-${Date.now()}-Aa1`;
}

export async function idDepuisEmail(email: string): Promise<string | null> {
  if (cleService()) {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const trouve = data.users.find((u) => u.email === email);
      if (trouve) return trouve.id;
      if (data.users.length < 200) return null;
    }
    return null;
  }
  const { rows } = await (await base()).query<{ id: string }>("select id from auth.users where email = $1", [email]);
  return rows[0]?.id ?? null;
}

async function ecrireUtilisateurSql(email: string, password: string): Promise<string> {
  const db = await base();
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
       extensions.crypt($2, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"pseudo":"E2E","gender":"male"}', now(), now(),
       '', '', '', '', '', '', '', '')
     returning id`,
    [email, password],
  );
  const id = rows[0].id;
  await db.query(
    `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
     values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
    [id, email],
  );
  return id;
}

/** Confirme un compte déjà créé par l'interface, ou le crée si l'inscription n'a rien écrit. */
export async function confirmerOuCreer(email: string, password: string): Promise<string> {
  const existant = await idDepuisEmail(email);
  if (cleService()) {
    if (existant) {
      const { error } = await admin().auth.admin.updateUserById(existant, { email_confirm: true, password });
      if (error) throw new Error(error.message);
      return existant;
    }
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { pseudo: "E2E", gender: "male" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Création admin impossible");
    return data.user.id;
  }
  if (existant) {
    await (await base()).query(
      `update auth.users set email_confirmed_at = now(),
         encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')), updated_at = now()
       where id = $1`,
      [existant, password],
    );
    return existant;
  }
  return ecrireUtilisateurSql(email, password);
}

export async function creerConfirme(email: string, password: string): Promise<string> {
  if (cleService()) {
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { pseudo: "E2E", gender: "male" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Création admin impossible");
    return data.user.id;
  }
  return ecrireUtilisateurSql(email, password);
}

export async function supprimerUtilisateur(id: string | null | undefined) {
  if (!id) return;
  if (cleService()) {
    const { error } = await admin().auth.admin.deleteUser(id);
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    return;
  }
  await (await base()).query("delete from auth.users where id = $1", [id]);
}

export async function supprimerEmail(email: string | null | undefined) {
  if (!email) return;
  await supprimerUtilisateur(await idDepuisEmail(email));
}

export async function compterProfils(): Promise<number> {
  if (cleService()) {
    const { count, error } = await admin().from("profiles").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const { rows } = await (await base()).query<{ n: string }>("select count(*)::text as n from public.profiles");
  return Number(rows[0].n);
}

export async function comptesE2ERestants(): Promise<string[]> {
  if (!cleService()) {
    const { rows } = await (await base()).query<{ id: string; email: string }>(
      "select id, email from auth.users where email like 'e2e+%@example.test'",
    );
    return rows.filter((u) => EMAIL_E2E.test(u.email)).map((u) => u.id);
  }
  const restants: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (u.email && EMAIL_E2E.test(u.email)) restants.push(u.id);
    }
    if (data.users.length < 200) break;
  }
  return restants;
}

export async function balayerComptesE2E() {
  for (const id of await comptesE2ERestants()) await supprimerUtilisateur(id);
}

type LigneLedger = { montant: number; mission_id: string | null };

export async function lireLedger(userId: string): Promise<LigneLedger[]> {
  if (cleService()) {
    const { data, error } = await admin().from("xp_ledger").select("montant, mission_id").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as LigneLedger[];
  }
  const { rows } = await (await base()).query<LigneLedger>(
    "select montant, mission_id from public.xp_ledger where user_id = $1",
    [userId],
  );
  return rows;
}

export async function lireMissions(userId: string): Promise<{ id: string; statut: string }[]> {
  if (cleService()) {
    const { data, error } = await admin().from("missions").select("id, statut").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; statut: string }[];
  }
  const { rows } = await (await base()).query<{ id: string; statut: string }>(
    "select id, statut from public.missions where user_id = $1",
    [userId],
  );
  return rows;
}

export async function lireValidations(userId: string): Promise<{ id: string; mission_id: string }[]> {
  if (cleService()) {
    const { data, error } = await admin().from("mission_validations").select("id, mission_id").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; mission_id: string }[];
  }
  const { rows } = await (await base()).query<{ id: string; mission_id: string }>(
    "select id, mission_id from public.mission_validations where user_id = $1",
    [userId],
  );
  return rows;
}

/** Niveau calculé par la fonction SQL, jamais une valeur figée. */
export async function niveauDepuisXp(xp: number): Promise<number> {
  if (cleService()) {
    const { data, error } = await admin().rpc("niveau_depuis_xp", { p_xp: xp });
    if (error) throw new Error(error.message);
    return Number(data);
  }
  const { rows } = await (await base()).query<{ n: number }>("select public.niveau_depuis_xp($1) as n", [xp]);
  return Number(rows[0].n);
}

export async function xpPourNiveau(n: number): Promise<number> {
  if (cleService()) {
    const { data, error } = await admin().rpc("xp_pour_niveau", { p_n: n });
    if (error) throw new Error(error.message);
    return Number(data);
  }
  const { rows } = await (await base()).query<{ n: number }>("select public.xp_pour_niveau($1) as n", [n]);
  return Number(rows[0].n);
}

export async function poserMissionAutre(userId: string, titre: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  if (cleService()) {
    const { error } = await admin().from("missions").insert({
      user_id: userId,
      date_locale: date,
      type: "daily",
      domaine: "life",
      competence_id: "e2e",
      titre,
      payload: { source: "libre" },
      statut: "a_faire",
    });
    if (error) throw new Error(error.message);
    return;
  }
  await (await base()).query(
    `insert into public.missions (user_id, date_locale, type, domaine, competence_id, titre, payload, statut)
     values ($1, $2, 'daily', 'life', 'e2e', $3, '{"source":"libre"}'::jsonb, 'a_faire')`,
    [userId, date, titre],
  );
}

export async function lireMissionAutre(userId: string): Promise<{ statut: string; titre: string } | null> {
  if (cleService()) {
    const { data, error } = await admin().from("missions").select("statut, titre").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  const { rows } = await (await base()).query<{ statut: string; titre: string }>(
    "select statut, titre from public.missions where user_id = $1 limit 1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function lireAdmin(userId: string): Promise<boolean> {
  if (cleService()) {
    const { data, error } = await admin().from("profiles").select("is_admin").eq("id", userId).single();
    if (error) throw new Error(error.message);
    return Boolean(data?.is_admin);
  }
  const { rows } = await (await base()).query<{ is_admin: boolean }>(
    "select is_admin from public.profiles where id = $1",
    [userId],
  );
  return Boolean(rows[0]?.is_admin);
}

export function sommeLedger(lignes: LigneLedger[]): number {
  return lignes.reduce((total, ligne) => total + ligne.montant, 0);
}

export async function connecter(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

export function jetonSession(cookies: { name: string; value: string }[]): string {
  const morceaux = new Map<string, string[]>();
  for (const cookie of cookies) {
    const match = cookie.name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
    if (!match) continue;
    const liste = morceaux.get(match[1]) ?? [];
    liste[match[2] ? Number(match[2]) : 0] = cookie.value;
    morceaux.set(match[1], liste);
  }
  const brut = [...morceaux.values()][0]?.join("") ?? "";
  if (!brut) throw new Error("Session navigateur introuvable");
  let texte = decodeURIComponent(brut);
  if (texte.startsWith("base64-")) {
    texte = Buffer.from(texte.slice("base64-".length), "base64url").toString("utf8");
  }
  const json = JSON.parse(texte) as { access_token?: string } | string[];
  if (Array.isArray(json) && typeof json[0] === "string") return json[0];
  if (!Array.isArray(json) && typeof json.access_token === "string") return json.access_token;
  throw new Error("Jeton de session introuvable");
}

export async function appelNavigateur(
  page: Page,
  token: string,
  chemin: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<{ status: number; text: string }> {
  const url = requis("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requis("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return page.evaluate(
    async ({ url, anon, token, chemin, method, body }) => {
      const res = await fetch(`${url}/rest/v1/${chemin}`, {
        method,
        headers: {
          apikey: anon,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, text: await res.text() };
    },
    { url, anon, token, chemin, method, body },
  );
}
