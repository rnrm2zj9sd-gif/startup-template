/**
 * Compare TypeScript et SQL : public.serie_depuis_jours == etatSerie
 * sur 300 séquences de jours pseudo-aléatoires (graine fixe, donc reproductible).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { etatSerie } from "../../lib/progression/serie";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

function decaler(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

test("TS et SQL : séries de jours identiques", async (t) => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "DATABASE_URL manquant");
  const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    let graine = 42;
    const alea = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;

    const ecarts: number[] = [];
    for (let k = 0; k < 300; k++) {
      const debut = decaler("2026-01-01", Math.floor(alea() * 200));
      const longueur = 1 + Math.floor(alea() * 140);
      const p = 0.2 + alea() * 0.79;
      const jours: string[] = [];
      for (let i = 0; i < longueur; i++) if (alea() < p) jours.push(decaler(debut, i));
      const aujourdHui = decaler(debut, longueur - 1 + Math.floor(alea() * 12));

      const res = await db.query<{ e: unknown }>(
        `select public.serie_depuis_jours($1::date[], $2::date) as e`,
        [jours, aujourdHui],
      );
      const attendu = JSON.parse(JSON.stringify(etatSerie(jours, aujourdHui)));
      try {
        assert.deepEqual(res.rows[0].e, attendu);
      } catch {
        ecarts.push(k);
      }
    }
    assert.equal(ecarts.length, 0, `serie_depuis_jours diverge aux cas ${ecarts.slice(0, 8).join(", ")}`);
    t.diagnostic("300 séquences : SQL identique au TypeScript");
  } finally {
    await db.end();
  }
});
