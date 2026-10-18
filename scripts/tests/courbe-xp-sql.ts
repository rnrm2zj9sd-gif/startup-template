/**
 * Compare TypeScript et SQL : xp_pour_niveau / rang_depuis_niveau pour 1–200,
 * et les bornes de rang 9/10, 24/25, 44/45, 69/70, 99/100.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { rangDepuisNiveau, xpPourNiveau, xpSeuilNiveau } from "../../lib/progression/niveau";
import { loadEnvLocal } from "../env-local";

loadEnvLocal();

test("TS et SQL : courbe XP et rangs identiques", async (t) => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "DATABASE_URL manquant");
  const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    const sqlXp = await db.query<{ n: number; xp: number }>(
      `select n, public.xp_pour_niveau(n) as xp from generate_series(1, 200) as n`,
    );
    const sqlRang = await db.query<{ n: number; rang: string }>(
      `select n, public.rang_depuis_niveau(n) as rang from generate_series(1, 200) as n`,
    );
    const parXp = new Map(sqlXp.rows.map((r) => [Number(r.n), Number(r.xp)]));
    const parRang = new Map(sqlRang.rows.map((r) => [Number(r.n), r.rang]));

    const ecartsXp: number[] = [];
    const ecartsRang: number[] = [];
    for (let n = 1; n <= 200; n++) {
      if (parXp.get(n) !== xpPourNiveau(n)) ecartsXp.push(n);
      if (parRang.get(n) !== rangDepuisNiveau(n)) ecartsRang.push(n);
    }
    assert.equal(ecartsXp.length, 0, `xp_pour_niveau diverge aux niveaux ${ecartsXp.slice(0, 8).join(", ")}`);
    assert.equal(ecartsRang.length, 0, `rang_depuis_niveau diverge aux niveaux ${ecartsRang.slice(0, 8).join(", ")}`);

    const bornes: [number, string][] = [
      [9, "E"],
      [10, "D"],
      [24, "D"],
      [25, "C"],
      [44, "C"],
      [45, "B"],
      [69, "B"],
      [70, "A"],
      [99, "A"],
      [100, "S"],
    ];
    for (const [n, rang] of bornes) {
      assert.equal(parRang.get(n), rang, `SQL rang(${n})`);
      assert.equal(rangDepuisNiveau(n), rang, `TS rang(${n})`);
    }

    const preuve = await db.query<{
      xp1: number;
      xp10: number;
      r9: string;
      r10: string;
      r100: string;
    }>(
      `select public.xp_pour_niveau(1) as xp1, public.xp_pour_niveau(10) as xp10,
              public.rang_depuis_niveau(9) as r9, public.rang_depuis_niveau(10) as r10,
              public.rang_depuis_niveau(100) as r100`,
    );
    const p = preuve.rows[0];
    assert.equal(p.xp1, 40);
    assert.equal(p.xp10, 247);
    assert.equal(p.r9, "E");
    assert.equal(p.r10, "D");
    assert.equal(p.r100, "S");
    assert.equal(xpSeuilNiveau(1), 0);
    t.diagnostic(`niveaux 1–200 alignés ; xp(1)=${p.xp1} xp(10)=${p.xp10} rangs ${p.r9}/${p.r10}/…/${p.r100}`);
  } finally {
    await db.end();
  }
});
