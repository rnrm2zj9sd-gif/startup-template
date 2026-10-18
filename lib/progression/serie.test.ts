import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { etatSerie } from "./serie";

/** Jours consécutifs à partir de `debut` (AAAA-MM-JJ), sauf les indices de `manques`. */
function jours(debut: string, n: number, manques: number[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (manques.includes(i)) continue;
    const d = new Date(`${debut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

describe("séries de jours", () => {
  it("aucun jour validé : série 0, pas de bonus", () => {
    const e = etatSerie([], "2026-10-16");
    assert.equal(e.serie, 0);
    assert.equal(e.bonusXpPct, 0);
    assert.equal(e.prochainPalier, 3);
  });

  it("7 jours validés d'affilée : série 7 et 1 bouclier", () => {
    const e = etatSerie(jours("2026-10-01", 7), "2026-10-07");
    assert.equal(e.serie, 7);
    assert.equal(e.boucliers, 1);
    assert.equal(e.bouclierGagneAujourdhui, true);
    assert.equal(e.joursVersBouclier, 7);
  });

  it("aujourd'hui pas encore validé : la série d'hier tient jusqu'à minuit", () => {
    const e = etatSerie(jours("2026-10-01", 5), "2026-10-06");
    assert.equal(e.serie, 5);
    assert.equal(e.serieHier, 5);
    assert.equal(e.aujourdHuiValide, false);
    assert.equal(e.dernierEvenement, null);
  });

  it("jour manqué avec bouclier : série conservée, bouclier consommé", () => {
    // 7 jours validés, le 8e manqué, le 9e validé.
    const e = etatSerie(jours("2026-10-01", 9, [7]), "2026-10-09");
    assert.equal(e.serie, 8);
    assert.equal(e.boucliers, 0);
    assert.deepEqual(e.dernierEvenement, { type: "bouclier", jour: "2026-10-08", serie: 7 });
    assert.equal(e.evenementHier, true);
  });

  it("jour manqué sans bouclier : série divisée par 2", () => {
    // 6 jours validés (pas de bouclier), le 7e manqué.
    const e = etatSerie(jours("2026-10-01", 6), "2026-10-08");
    assert.equal(e.serie, 3);
    assert.deepEqual(e.dernierEvenement, { type: "moitie", jour: "2026-10-07", avant: 6, apres: 3 });
  });

  it("chaque jour manqué sans bouclier divise encore par 2", () => {
    // 20 jours validés (2 boucliers), puis 5 jours manqués : 2 boucliers, puis 20 → 10 → 5 → 2.
    const e = etatSerie(jours("2026-10-01", 20), "2026-10-26");
    assert.equal(e.serie, 2);
    assert.equal(e.boucliers, 0);
    assert.equal(e.record, 20);
    assert.equal(e.evenementHier, true);
    // Série retombée à 0 le 27 : plus aucun événement ensuite, donc rien à annoncer le 30.
    const longue = etatSerie(jours("2026-10-01", 20), "2026-10-30");
    assert.equal(longue.serie, 0);
    assert.equal(longue.evenementHier, false);
    assert.equal(etatSerie(jours("2026-10-01", 9, [7]), "2026-10-20").evenementHier, false);
  });

  it("un jour sur deux ne construit pas de série", () => {
    const unSurDeux = jours("2026-10-01", 30).filter((_, i) => i % 2 === 0);
    const e = etatSerie(unSurDeux, "2026-10-29");
    assert.ok(e.serie <= 1, `série ${e.serie}`);
  });

  it("stock de boucliers plafonné à 2", () => {
    const e = etatSerie(jours("2026-10-01", 28), "2026-10-28");
    assert.equal(e.boucliers, 2);
    assert.equal(e.bouclierGagneAujourdhui, false);
  });

  it("bonus XP : 2 % par jour de série d'hier, plafonné à 30 %", () => {
    assert.equal(etatSerie(jours("2026-10-01", 5), "2026-10-06").bonusXpPct, 10);
    assert.equal(etatSerie(jours("2026-10-01", 40), "2026-11-10").bonusXpPct, 30);
  });

  it("record et prochain palier", () => {
    const e = etatSerie(jours("2026-10-01", 14), "2026-10-14");
    assert.equal(e.record, 14);
    assert.equal(e.nouveauRecord, true);
    assert.equal(e.prochainPalier, 30);
  });

  it("doublons et jours futurs ignorés", () => {
    const e = etatSerie(["2026-10-01", "2026-10-01", "2026-10-02", "2026-12-31"], "2026-10-02");
    assert.equal(e.serie, 2);
  });
});
