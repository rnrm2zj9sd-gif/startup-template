import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const EMAIL_E2E = /^e2e\+\d+-[a-z0-9]+@example\.test$/;

export function chargerEnv() {
  for (const fichier of [".env.test", ".env.local"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), fichier), "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq);
        let value = trimmed.slice(eq + 1);
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // fichier absent
    }
  }
}

chargerEnv();

function requis(nom: string): string {
  const valeur = process.env[nom]?.trim();
  if (!valeur) throw new Error(`${nom} manquante (fichier .env.test ou .env.local, jamais dans le dépôt).`);
  return valeur;
}

let client: SupabaseClient | null = null;

/** Client admin : la clé service role reste dans le process de test. */
export function admin(): SupabaseClient {
  if (!client) {
    client = createClient(requis("NEXT_PUBLIC_SUPABASE_URL"), requis("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export function emailE2E(): string {
  const alea = Math.random().toString(36).slice(2, 8);
  return `e2e+${Date.now()}-${alea}@example.test`;
}

export function motDePasseE2E(): string {
  return `E2e-${Date.now()}-Aa1`;
}

export async function idDepuisEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const trouve = data.users.find((u) => u.email === email);
    if (trouve) return trouve.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Confirme un compte déjà créé par l'interface, ou le crée si l'inscription n'a rien écrit. */
export async function confirmerOuCreer(email: string, password: string): Promise<string> {
  const existant = await idDepuisEmail(email);
  if (existant) {
    const { error } = await admin().auth.admin.updateUserById(existant, {
      email_confirm: true,
      password,
    });
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

export async function creerConfirme(email: string, password: string): Promise<string> {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pseudo: "E2E", gender: "male" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Création admin impossible");
  return data.user.id;
}

export async function supprimerUtilisateur(id: string | null | undefined) {
  if (!id) return;
  const { error } = await admin().auth.admin.deleteUser(id);
  if (error && !/not found/i.test(error.message)) throw new Error(error.message);
}

export async function supprimerEmail(email: string | null | undefined) {
  if (!email) return;
  await supprimerUtilisateur(await idDepuisEmail(email));
}

export async function compterProfils(): Promise<number> {
  const { count, error } = await admin().from("profiles").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function comptesE2ERestants(): Promise<string[]> {
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
  const { data, error } = await admin().from("xp_ledger").select("montant, mission_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as LigneLedger[];
}

export async function lireMissions(userId: string): Promise<{ id: string; statut: string }[]> {
  const { data, error } = await admin().from("missions").select("id, statut").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; statut: string }[];
}

export async function lireValidations(userId: string): Promise<{ id: string; mission_id: string }[]> {
  const { data, error } = await admin()
    .from("mission_validations")
    .select("id, mission_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; mission_id: string }[];
}

/** Niveau calculé par la fonction SQL, jamais une valeur figée. */
export async function niveauDepuisXp(xp: number): Promise<number> {
  const { data, error } = await admin().rpc("niveau_depuis_xp", { p_xp: xp });
  if (error) throw new Error(error.message);
  return Number(data);
}

export async function xpPourNiveau(n: number): Promise<number> {
  const { data, error } = await admin().rpc("xp_pour_niveau", { p_n: n });
  if (error) throw new Error(error.message);
  return Number(data);
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
