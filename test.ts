import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogPersoDemo } from "./lib/moteur/catalogue-perso-demo";
import { CATALOGUE } from "./lib/moteur/catalogue";
import { calculerXP, etatInitial, genererSeance, planifierSemaine } from "./lib/moteur/moteur";
import { fusionnerCatalogue, validerExercicePerso } from "./lib/moteur/personnalisation";
import type { CataloguePerso, ExercicePerso, Profil } from "./lib/moteur/types";

const perso60: ExercicePerso = {
  id: "perso-60-difficile",
  nom: "Marathon perso",
  competenceId: "test-xp",
  focusId: "seul",
  difficulte: "difficile",
  mesure: "minutes",
  valeur: 60,
  progression: false,
};

const catalogTest: CataloguePerso = {
  ...catalogPersoDemo,
  competences: [
    ...catalogPersoDemo.competences,
    {
      id: "test-xp",
      nom: "Test XP",
      domaine: "Perso",
      focusParSeance: 1,
      focus: [{ id: "seul", nom: "Seul", recuperationJours: 0 }],
    },
  ],
  exercices: [...catalogPersoDemo.exercices, perso60],
};

const profil: Profil = {
  userId: "test-perso",
  materiel: ["aucun", "papier_stylo", "telephone", "corde_a_sauter"],
  budgetMinutesJour: 45,
  catalogPerso: catalogTest,
  choix: [
    { competenceId: "musculation", focusIds: ["abdos", "epaules", "bras", "dos", "avant-bras"], seancesParSemaine: 5, minutesMax: 15 },
    { competenceId: "endurance", focusIds: ["intervalles"], seancesParSemaine: 5, minutesMax: 12, niveauDepart: 3 },
    { competenceId: "guitare", focusIds: [], seancesParSemaine: 3, minutesMax: 15 },
  ],
};

test("la fusion ne modifie pas CATALOGUE", () => {
  const avant = JSON.stringify(CATALOGUE);
  const fusion = fusionnerCatalogue(CATALOGUE, catalogTest);
  assert.equal(JSON.stringify(CATALOGUE), avant);
  assert.ok(fusion.guitare);
  assert.ok(fusion.musculation.focus.some((f) => f.id === "avant-bras"));
  assert.ok(!fusion.endurance.exercices.some((e) => e.id === "corde"));
  assert.ok(CATALOGUE.endurance.exercices.some((e) => e.id === "corde"));
});

test("Ma routine abdos apparaît dès que la zone Abdos est choisie", () => {
  const plan = planifierSemaine(profil, etatInitial(), CATALOGUE, "2026-10-12");
  const seancesAbdos = plan.flatMap((j) => j.seances).filter((s) => s.focusIds.includes("abdos"));
  assert.ok(seancesAbdos.length > 0, "au moins une séance Abdos");
  for (const s of seancesAbdos) {
    assert.ok(
      s.exercices.some((e) => e.exerciceId === "perso-routine-abdos"),
      `Manque « Ma routine abdos » le ${s.date}`,
    );
  }
});

test("la corde à sauter n'apparaît jamais", () => {
  const plan = planifierSemaine(profil, etatInitial(), CATALOGUE, "2026-10-12");
  const ids = plan.flatMap((j) => j.seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)));
  assert.ok(!ids.includes("corde"));
});

test("Avant-bras et Guitare apparaissent dans le planning", () => {
  const plan = planifierSemaine(profil, etatInitial(), CATALOGUE, "2026-10-12");
  const zones = new Set(plan.flatMap((j) => j.seances.flatMap((s) => s.focusIds)));
  const competences = new Set(plan.flatMap((j) => j.seances.map((s) => s.competenceId)));
  assert.ok(zones.has("avant-bras"), "zone Avant-bras absente");
  assert.ok(competences.has("guitare"), "compétence Guitare absente");
});

test("un perso 60 min difficile est plafonné à 30 min × 1,3 avant 5 validations", () => {
  const seance = genererSeance(
    { ...profil, choix: [{ competenceId: "test-xp", focusIds: ["seul"], seancesParSemaine: 1, minutesMax: 60 }] },
    etatInitial(),
    CATALOGUE,
    { competenceId: "test-xp", focusIds: ["seul"], seancesParSemaine: 1, minutesMax: 60 },
    "2026-10-12",
    [],
    60,
  );
  assert.equal(seance.exercices[0]?.exerciceId, "perso-60-difficile");
  const plafond = calculerXP(30, 3, 0);
  const sansPlafond = calculerXP(60, 3, 0);
  assert.ok(seance.xpEstime <= plafond, `XP ${seance.xpEstime} > plafond ${plafond}`);
  assert.ok(seance.xpEstime < sansPlafond, "le plafond 30 min doit réduire l'XP");
});

test("validerExercicePerso refuse valeur 0, nom vide et zone inexistante", () => {
  const base = {
    competenceId: "musculation",
    focusId: "abdos",
    difficulte: "facile" as const,
    mesure: "minutes" as const,
    valeur: 5,
    progression: false,
  };
  assert.ok(validerExercicePerso({ ...base, nom: "Abdos du soir", valeur: 0 }, CATALOGUE).some((e) => /minutes|valeur|entre/i.test(e)));
  assert.ok(validerExercicePerso({ ...base, nom: "" }, CATALOGUE).some((e) => /nom/i.test(e)));
  assert.ok(validerExercicePerso({ ...base, nom: "Abdos du soir", focusId: "zone-fantome" }, CATALOGUE).some((e) => /zone/i.test(e)));
});

test("aucun jour ne dépasse budgetMinutesJour", () => {
  const plan = planifierSemaine(profil, etatInitial(), CATALOGUE, "2026-10-12");
  for (const j of plan) {
    assert.ok(j.minutesTotal <= profil.budgetMinutesJour, `${j.jour} ${j.minutesTotal} > ${profil.budgetMinutesJour}`);
  }
});

test("l'initiation pose 4 questions principales plus 1 par secondaire", async () => {
  const { buildQuestionList } = await import("./config/onboarding-data");
  const liste = buildQuestionList("physique", ["finance", "discipline"]);
  assert.equal(liste.length, 6);
  assert.equal(liste.filter((q) => q.goal === "physique").length, 4);
});

test("onboarding : 2 à 3 compétences du catalogue, zones et budget vérifiés", async () => {
  const { validerOnboarding, profilDepuisOnboarding } = await import("./lib/onboarding");
  const base = { pseudo: "Test", gender: "female", budgetMinutes: 20, materiel: ["halteres"] };
  const ok = validerOnboarding({
    ...base,
    competences: [{ id: "musculation", focusIds: ["abdos"] }, { id: "education-financiere", focusIds: [] }],
  });
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.deepEqual(ok.value.materiel, ["aucun", "halteres"]);
  const contrat = profilDepuisOnboarding("test", ok.value);
  assert.equal(contrat.choix.length, 2);
  assert.equal(contrat.budgetMinutesJour, 20);

  assert.equal(validerOnboarding({ ...base, competences: [{ id: "musculation" }] }).ok, false);
  assert.equal(validerOnboarding({ ...base, competences: [{ id: "x" }, { id: "musculation" }] }).ok, false);
  assert.equal(
    validerOnboarding({ ...base, competences: [{ id: "musculation", focusIds: ["nope"] }, { id: "endurance" }] }).ok,
    false,
  );
  assert.equal(validerOnboarding({ ...base, budgetMinutes: 7, competences: [{ id: "musculation" }, { id: "endurance" }] }).ok, false);
});

test("première victoire : mission plancher de 2 minutes, XP positive", async () => {
  const { premiereVictoire } = await import("./lib/onboarding");
  const m = premiereVictoire({ competences: [{ id: "musculation", focusIds: ["abdos"] }], materiel: ["aucun"] });
  assert.equal(m.type, "first");
  assert.equal(m.duree_min, 2);
  assert.ok(m.xp_prevu > 0);
  assert.ok(m.description.length > 0);
});
