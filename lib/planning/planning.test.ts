import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colonnesChevauchement, pairesQuiSeChevauchent } from "./chevauchements";
import { decalerVue, joursSemaine, lundiDe, libellePeriode } from "./dates";
import { filtreEvenement, statsPeriode } from "./stats";
import type { CalendarEvent, PlanningMission } from "./types";
import { validerBrouillon, xpPotentielle } from "./valider";
import { calculerXpMission } from "@/lib/progression/xp";

function ev(patch: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: patch.id ?? "a",
    user_id: "u",
    titre: "Tâche",
    description: "",
    kind: "productive",
    domaine: "mind",
    difficulte: "moyen",
    start_at: "2026-10-17T08:00:00.000Z",
    end_at: "2026-10-17T09:00:00.000Z",
    statut: "planifiee",
    mission_id: null,
    xp_prevu: 33,
    xp_gagne: null,
    created_at: "2026-10-17T07:00:00.000Z",
    updated_at: "2026-10-17T07:00:00.000Z",
    completed_at: null,
    ...patch,
  };
}

describe("planning : validation", () => {
  it("refuse une fin avant le début", () => {
    const err = validerBrouillon({
      titre: "Réviser",
      kind: "productive",
      domaine: "mind",
      difficulte: "moyen",
      startAt: new Date("2026-10-17T10:00:00Z"),
      endAt: new Date("2026-10-17T09:00:00Z"),
    });
    assert.ok(err);
  });

  it("refuse une fin égale au début", () => {
    const t = new Date("2026-10-17T10:00:00Z");
    assert.ok(validerBrouillon({ titre: "X", kind: "pause", startAt: t, endAt: t }));
  });

  it("exige pilier et difficulté pour une tâche", () => {
    const err = validerBrouillon({
      titre: "Sport",
      kind: "productive",
      startAt: new Date("2026-10-17T10:00:00Z"),
      endAt: new Date("2026-10-17T11:00:00Z"),
    });
    assert.ok(err);
  });

  it("accepte un événement sans pilier", () => {
    assert.equal(
      validerBrouillon({
        titre: "Dentiste",
        kind: "personnel",
        startAt: new Date("2026-10-17T10:00:00Z"),
        endAt: new Date("2026-10-17T11:00:00Z"),
      }),
      null,
    );
  });
});

describe("planning : XP potentielle", () => {
  it("reprend la formule centrale pour une tâche", () => {
    const attendu = calculerXpMission(
      { dureeMin: 20, difficulte: "moyen", prevue: true, perso: false },
      { chaineJours: 0 },
    );
    assert.equal(xpPotentielle({ kind: "productive", dureeMin: 20, difficulte: "moyen" }), attendu);
    assert.equal(attendu, 33);
  });

  it("donne 0 pour un événement et une pause", () => {
    assert.equal(xpPotentielle({ kind: "personnel", dureeMin: 60, difficulte: "difficile" }), 0);
    assert.equal(xpPotentielle({ kind: "pause", dureeMin: 30 }), 0);
  });
});

describe("planning : chevauchements", () => {
  it("détecte un recouvrement", () => {
    const p = pairesQuiSeChevauchent([
      { id: "a", start: 14 * 60, end: 15 * 60 },
      { id: "b", start: 14.5 * 60, end: 15.5 * 60 },
    ]);
    assert.equal(p.length, 1);
  });

  it("ignore deux créneaux qui se touchent", () => {
    const p = pairesQuiSeChevauchent([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 60, end: 120 },
    ]);
    assert.equal(p.length, 0);
  });

  it("place deux recouvrements dans des colonnes distinctes", () => {
    const layout = colonnesChevauchement([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 30, end: 90 },
    ]);
    assert.equal(layout.get("a")?.cols, 2);
    assert.equal(layout.get("b")?.cols, 2);
    assert.notEqual(layout.get("a")?.col, layout.get("b")?.col);
  });
});

describe("planning : indicateurs et filtres", () => {
  it("calcule le taux sans diviser par zéro", () => {
    const vide = statsPeriode([]);
    assert.equal(vide.taux, null);
    assert.equal(vide.planifiees, 0);
  });

  it("compte les tâches productives et l'XP réelle", () => {
    const events = [
      ev({ id: "1", statut: "terminee", xp_prevu: 33, xp_gagne: 30 }),
      ev({ id: "2", statut: "planifiee", xp_prevu: 33 }),
      ev({ id: "3", kind: "pause", statut: "terminee", xp_prevu: 0, xp_gagne: 0 }),
      ev({ id: "4", statut: "annulee", xp_prevu: 49 }),
    ];
    const missions: PlanningMission[] = [
      { id: "m", titre: "Daily", description: "", date_locale: "2026-10-17", domaine: "fitness", duree_min: 15, difficulte: "moyen", xp_prevu: 24, xp_gagne: 24, statut: "terminee", type: "daily" },
    ];
    const s = statsPeriode(events, missions);
    assert.equal(s.terminees, 2);
    assert.equal(s.xpGagnee, 54);
    assert.equal(s.annulees, 1);
    assert.ok(s.taux != null);
  });

  it("filtre par pilier et type", () => {
    const e = ev({ domaine: "finance" });
    assert.equal(filtreEvenement(e, { kind: "tous", statut: "tous", domaine: "finance" }), true);
    assert.equal(filtreEvenement(e, { kind: "pause", statut: "tous", domaine: "tous" }), false);
    assert.equal(filtreEvenement(e, { kind: "tous", statut: "terminees", domaine: "tous" }), false);
  });
});

describe("planning : navigation", () => {
  it("aligne la semaine sur le lundi", () => {
    assert.equal(lundiDe("2026-10-17"), "2026-10-12");
    assert.deepEqual(joursSemaine("2026-10-17")[0], "2026-10-12");
    assert.deepEqual(joursSemaine("2026-10-17")[6], "2026-10-18");
  });

  it("décale jour, semaine et mois", () => {
    assert.equal(decalerVue("jour", "2026-10-17", 1), "2026-10-18");
    assert.equal(decalerVue("semaine", "2026-10-17", -1), "2026-10-10");
    assert.equal(decalerVue("mois", "2026-10-17", 1), "2026-11-01");
    assert.ok(libellePeriode("mois", "2026-10-17").length > 3);
  });
});
