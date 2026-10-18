import { createHmac, timingSafeEqual } from "node:crypto";

const DUREE_S = 60 * 60;

function secret(): string {
  const dedie = process.env.ACCOUNT_TOKEN_SECRET?.trim();
  const repli = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const valeur = dedie || repli;
  if (!valeur) throw new Error("ACCOUNT_TOKEN_SECRET manquant.");
  return valeur;
}

function signer(corps: string): string {
  return createHmac("sha256", secret()).update(corps).digest("base64url");
}

export function creerJetonSuppression(userId: string): { jeton: string; expireAt: number } {
  const expireAt = Math.floor(Date.now() / 1000) + DUREE_S;
  const corps = `v1:${expireAt}:${userId}`;
  return { jeton: `v1.${expireAt}.${userId}.${signer(corps)}`, expireAt };
}

export function lireJetonSuppression(jeton: string): { userId: string } | null {
  const parts = jeton.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, expTexte, userId, mac] = parts;
  const expireAt = Number(expTexte);
  if (!Number.isFinite(expireAt) || expireAt * 1000 < Date.now()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !mac) return null;
  const attendu = signer(`v1:${expireAt}:${userId}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { userId };
}
