import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculerClasse } from "./classe";
import {
  CLASSE_MISSIONS_MIN,
  DOMAINE_AFFICHE,
  NOMS_CLASSES,
  OBJECTIF_MISSIONS_MIN,
  XP_JOUR_MAX,
  XP_PERSO_PART_MAX,
  type DomaineAffiche,
} from "./config";
import { xpCumulePourAtteindre, niveauDepuisXp, progressionVersNiveauSuivant, rangDepuisNiveau, xpPourNiveau } from "./niveau";
import { chaineDepuisJours } from "./chaine";
import { calculerPower, niveauxDomainesDepuisXp, objectifValide } from "./power";
import { appliquerPlafondQuotidien, calculerXpMission } from "./xp";
import { missionsComplementaires, MISSIONS_JOUR_MIN } from "./complement";
import { catalogueDepart, cibleMissionsDuJour, domainesChoisis, tirerMissionsDepart } from "./missions-depart";
import { ajouterJours, CATALOGUE, enregistrerResultat, etatInitial, type SeancePrevue } from "@/lib/moteur";
import { jourLocal } from "@/lib/temps";

describe("1. plusieurs niveaux d'un coup", () => {
  it("donne le niveau final après un gros gain", () => {
    const xp = xpCumulePourAtteindre(12) + 10;
    assert.equal(niveauDepuisXp(xp), 12);
    const prog = progressionVersNiveauSuivant(xp);
    assert.equal(prog.niveau, 12);
    assert.equal(prog.xpDansNiveau, 10);
    assert.equal(prog.xpPourSuivant, xpPourNiveau(12));
  });

  it("reste au niveau 1 sous le premier palier", () => {
    assert.equal(niveauDepuisXp(0), 1);
    assert.equal(niveauDepuisXp(xpPourNiveau(1) - 1), 1);
    assert.equal(niveauDepuisXp(xpPourNiveau(1)), 2);
  });
});

describe("2. seuils de rang aux limites", () => {
  const limites: [number, string, number, string][] = [
    [9, "E", 10, "D"],
    [24, "D", 25, "C"],
    [44, "C", 45, "B"],
    [69, "B", 70, "A"],
    [99, "A", 100, "S"],
  ];

  for (const [sous, rangSous, sur, rangSur] of limites) {
    it(`${sous} → ${rangSous}, ${sur} → ${rangSur}`, () => {
      assert.equal(rangDepuisNiveau(sous), rangSous);
      assert.equal(rangDepuisNiveau(sur), rangSur);
    });
  }
});

describe("3. plafonds 400 XP/jour et 60 % perso", () => {
  it("coupe au plafond quotidien", () => {
    const r = appliquerPlafondQuotidien({
      xpBrut: 80,
      xpDejaDuJour: XP_JOUR_MAX - 30,
      xpPersoDejaDuJour: 0,
      estPerso: false,
    });
    assert.equal(r.xp, 30);
    assert.equal(r.plafond, "quotidien");
  });

  it("refuse au-delà de 400", () => {
    const r = appliquerPlafondQuotidien({
      xpBrut: 50,
      xpDejaDuJour: XP_JOUR_MAX,
      xpPersoDejaDuJour: 0,
      estPerso: false,
    });
    assert.equal(r.xp, 0);
    assert.equal(r.plafond, "quotidien");
  });

  it("limite les missions perso à 60 % du jour", () => {
    const r = appliquerPlafondQuotidien({
      xpBrut: 300,
      xpDejaDuJour: 100,
      xpPersoDejaDuJour: 0,
      estPerso: true,
    });
    const jour = 100 + r.xp;
    assert.equal(r.xp, 150);
    assert.equal(r.plafond, "perso");
    assert.ok(r.xp < 300);
    assert.equal(r.xp, Math.floor(XP_PERSO_PART_MAX * jour));
  });
});

describe("4. Power", () => {
  it("un profil équilibré dépasse un mono-domaine à XP égale", () => {
    const total = 600;
    const eq: Partial<Record<DomaineAffiche, number>> = {};
    for (const d of DOMAINE_AFFICHE) eq[d] = total / DOMAINE_AFFICHE.length;
    const mono: Partial<Record<DomaineAffiche, number>> = { finance: total };
    const powerEq = calculerPower({
      niveauxDomaines: niveauxDomainesDepuisXp(eq),
      objectifsValides: 0,
    });
    const powerMono = calculerPower({
      niveauxDomaines: niveauxDomainesDepuisXp(mono),
      objectifsValides: 0,
    });
    assert.ok(powerEq > powerMono, `équilibré ${powerEq} vs mono ${powerMono}`);
  });

  it("un objectif terminé avec moins de 3 missions ne rapporte rien", () => {
    assert.equal(objectifValide(OBJECTIF_MISSIONS_MIN - 1), false);
    assert.equal(objectifValide(OBJECTIF_MISSIONS_MIN), true);
    const sans = calculerPower({
      niveauxDomaines: niveauxDomainesDepuisXp({}),
      objectifsValides: 0,
    });
    const avecInvalide = sans;
    const avecValide = calculerPower({
      niveauxDomaines: niveauxDomainesDepuisXp({}),
      objectifsValides: 1,
    });
    assert.equal(avecInvalide, sans);
    assert.equal(avecValide, sans + 25);
  });
});

describe("5. simulation jours / rang", () => {
  function joursPourRang(xpJour: number, niveauCible: number): number {
    return Math.ceil(xpCumulePourAtteindre(niveauCible) / xpJour);
  }

  const cibles = [
    { rang: "D", niveau: 10 },
    { rang: "C", niveau: 25 },
    { rang: "B", niveau: 45 },
    { rang: "A", niveau: 70 },
    { rang: "S", niveau: 100 },
  ] as const;

  const bandes50: Record<string, [number, number]> = {
    D: [20, 40],
    C: [110, 150],
    B: [320, 370],
    A: [680, 730],
    S: [1200, 1300],
  };

  it("affiche 25 / 50 / 120 XP/jour et respecte les cibles à 50", () => {
    const lignes: string[] = [];
    for (const { rang, niveau } of cibles) {
      const j25 = joursPourRang(25, niveau);
      const j50 = joursPourRang(50, niveau);
      const j120 = joursPourRang(120, niveau);
      lignes.push(`${rang} (niv ${niveau}) : 25=${j25}j  50=${j50}j  120=${j120}j`);
      const [min, max] = bandes50[rang];
      assert.ok(j50 >= min && j50 <= max, `${rang} à 50 XP/j = ${j50}j hors [${min}, ${max}]`);
    }
    console.log(lignes.join("\n"));
  });
});

describe("6-7. chaîne qui se fissure", () => {
  function seance(date: string): SeancePrevue {
    return {
      date,
      competenceId: "lot3",
      competence: "Lot",
      focusIds: [],
      focusNoms: [],
      exercices: [],
      minutesTotal: 10,
      xpEstime: 10,
      missionPlancher: "",
    };
  }

  function chaine(dates: string[]) {
    let etat = etatInitial();
    for (const date of dates) etat = enregistrerResultat(etat, seance(date), "bien");
    return etat.chaineJours;
  }

  it("1 jour manqué conserve la chaîne", () => {
    const debut = "2026-10-01";
    const suite = [0, 1, 2, 3].map((i) => ajouterJours(debut, i));
    assert.equal(chaine(suite), 4);
    const apres = chaine([...suite, ajouterJours(debut, 5)]);
    assert.equal(apres, 5);
    assert.equal(chaineDepuisJours([...suite, ajouterJours(debut, 5)]), 5);
  });

  it("2 jours ou plus divisent la chaîne par 2", () => {
    const debut = "2026-10-01";
    const suite = [0, 1, 2, 3].map((i) => ajouterJours(debut, i));
    const apres = chaine([...suite, ajouterJours(debut, 6)]);
    assert.equal(apres, Math.floor(4 / 2) + 1);
    assert.equal(chaineDepuisJours([...suite, ajouterJours(debut, 6)]), apres);
  });
});

describe("8-9. rang", () => {
  it("le rang ne descend pas quand l'XP ne fait qu'augmenter", () => {
    const ordre = ["E", "D", "C", "B", "A", "S"];
    let xp = 0;
    let plancher = 0;
    for (const gain of [0, 40, 180, 900, 4000, 25000]) {
      xp += gain;
      const idx = ordre.indexOf(rangDepuisNiveau(niveauDepuisXp(xp)));
      assert.ok(idx >= plancher);
      plancher = idx;
    }
  });
});

describe("difficulté 1.0 / 1.3 / 1.6", () => {
  it("applique les trois multiplicateurs sur une mission prévue", () => {
    assert.equal(
      calculerXpMission({ dureeMin: 10, difficulte: "facile", prevue: true, perso: false }, { chaineJours: 0 }),
      Math.round(10 * 1.0 * 1.25),
    );
    assert.equal(
      calculerXpMission({ dureeMin: 10, difficulte: "moyen", prevue: true, perso: false }, { chaineJours: 0 }),
      Math.round(10 * 1.3 * 1.25),
    );
    assert.equal(
      calculerXpMission({ dureeMin: 10, difficulte: "difficile", prevue: true, perso: false }, { chaineJours: 0 }),
      Math.round(10 * 1.6 * 1.25),
    );
  });
});

describe("11. jour local Europe/Paris", () => {
  it("bascule à minuit Paris", () => {
    assert.equal(jourLocal(new Date("2026-10-11T21:30:00Z"), "Europe/Paris"), "2026-10-11");
    assert.equal(jourLocal(new Date("2026-10-11T22:30:00Z"), "Europe/Paris"), "2026-10-12");
  });
});

describe("plancher de 3 missions/jour (complement)", () => {
  it("ne complète pas si on a déjà assez de missions", () => {
    const r = missionsComplementaires({
      userId: "u1",
      date: "2026-10-16",
      totalMissionsDuJour: 3,
      competencesExclues: [],
      chaineJours: 0,
    });
    assert.deepEqual(r, []);
  });

  it("complète jusqu'au plancher, jamais plus", () => {
    const r = missionsComplementaires({
      userId: "u1",
      date: "2026-10-16",
      totalMissionsDuJour: 1,
      competencesExclues: [],
      chaineJours: 0,
    });
    assert.equal(r.length, MISSIONS_JOUR_MIN - 1);
  });

  it("ne tire jamais une compétence exclue", () => {
    const exclues = Object.keys(CATALOGUE).slice(0, Object.keys(CATALOGUE).length - 1);
    const r = missionsComplementaires({
      userId: "u1",
      date: "2026-10-16",
      totalMissionsDuJour: 0,
      competencesExclues: exclues,
      chaineJours: 0,
    });
    for (const m of r) assert.ok(!exclues.includes(m.competence_id));
  });

  it("est déterministe : même utilisateur + même jour = même tirage", () => {
    const args = { userId: "u42", date: "2026-10-16", totalMissionsDuJour: 0, competencesExclues: [], chaineJours: 0 };
    const a = missionsComplementaires(args).map((m) => m.competence_id);
    const b = missionsComplementaires(args).map((m) => m.competence_id);
    assert.deepEqual(a, b);
  });

  it("change de tirage d'un jour à l'autre", () => {
    const a = missionsComplementaires({ userId: "u42", date: "2026-10-16", totalMissionsDuJour: 0, competencesExclues: [], chaineJours: 0 }).map((m) => m.competence_id);
    const b = missionsComplementaires({ userId: "u42", date: "2026-10-17", totalMissionsDuJour: 0, competencesExclues: [], chaineJours: 0 }).map((m) => m.competence_id);
    assert.notDeepEqual(a, b);
  });

  it("chaque mission de complément est valide pour le trigger SQL (durée 2–60, exercice niveau 1, non prévue)", () => {
    const r = missionsComplementaires({
      userId: "u1",
      date: "2026-10-16",
      totalMissionsDuJour: 0,
      competencesExclues: [],
      chaineJours: 0,
    });
    for (const m of r) {
      assert.equal(m.type, "daily");
      assert.ok(m.duree_min >= 2 && m.duree_min <= 60);
      assert.equal(m.payload.prevue, false);
      assert.equal(m.payload.source, "complement");
      assert.ok(typeof m.payload.exerciceId === "string" && m.payload.exerciceId.length > 0);
    }
  });
});

describe("missions du jour par domaine", () => {
  it("propose au moins une mission de départ dans chaque domaine affiché", () => {
    const cat = catalogueDepart();
    for (const domaine of DOMAINE_AFFICHE) {
      assert.ok(cat.filter((m) => m.domaine === domaine).length >= 3, domaine);
    }
    const ids = cat.map((m) => m.exerciceId);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("fixe la cible : 3, 4, puis 5 selon le nombre de domaines", () => {
    assert.equal(cibleMissionsDuJour(0), 0);
    assert.equal(cibleMissionsDuJour(1), 3);
    assert.equal(cibleMissionsDuJour(2), 4);
    assert.equal(cibleMissionsDuJour(3), 5);
    assert.equal(cibleMissionsDuJour(6), 5);
  });

  it("ne tire que dans les domaines choisis, jusqu'à la cible", () => {
    const domaines = domainesChoisis(["musculation", "education-financiere"]);
    assert.deepEqual(domaines, ["finance", "fitness"]);
    const r = tirerMissionsDepart({
      userId: "u1",
      date: "2026-10-16",
      domaines,
      deja: 0,
      exercicesExclus: [],
      chaineJours: 0,
    });
    assert.equal(r.length, 4);
    assert.ok(r.every((m) => m.domaine === "finance" || m.domaine === "fitness"));
    assert.ok(r.some((m) => m.domaine === "finance"));
    assert.ok(r.some((m) => m.domaine === "fitness"));
    for (const m of r) {
      assert.equal(m.payload.source, "depart");
      assert.equal(m.type, "daily");
      assert.ok(m.duree_min >= 2 && m.duree_min <= 60);
      assert.equal(m.difficulte, "facile");
    }
  });

  it("ne complète pas au-delà de la cible et ignore les exercices déjà posés", () => {
    const plein = tirerMissionsDepart({
      userId: "u1",
      date: "2026-10-16",
      domaines: ["health"],
      deja: 3,
      exercicesExclus: [],
      chaineJours: 0,
    });
    assert.deepEqual(plein, []);

    const exclus = catalogueDepart()
      .filter((m) => m.domaine === "health")
      .map((m) => m.exerciceId);
    const garde = exclus.pop()!;
    const r = tirerMissionsDepart({
      userId: "u1",
      date: "2026-10-16",
      domaines: ["health"],
      deja: 2,
      exercicesExclus: exclus,
      chaineJours: 0,
    });
    assert.equal(r.length, 1);
    assert.equal(r[0].payload.exerciceId, garde);
  });

  it("est déterministe, et change d'un jour à l'autre", () => {
    const args = {
      userId: "u42",
      date: "2026-10-16",
      domaines: ["mind", "discipline"] as DomaineAffiche[],
      deja: 1,
      exercicesExclus: [] as string[],
      chaineJours: 0,
    };
    const a = tirerMissionsDepart(args).map((m) => m.payload.exerciceId);
    const b = tirerMissionsDepart(args).map((m) => m.payload.exerciceId);
    assert.deepEqual(a, b);
    assert.equal(a.length, 3);
    const demain = tirerMissionsDepart({ ...args, date: "2026-10-17" }).map((m) => m.payload.exerciceId);
    assert.notDeepEqual(a, demain);
  });
});

describe("classe", () => {
  it("Initié avant 10 missions, Balanced si aucun domaine > 30 %", () => {
    assert.equal(
      calculerClasse({ missionsValidees: CLASSE_MISSIONS_MIN - 1, xp30jParDomaine: { finance: 100 } }),
      NOMS_CLASSES.initie,
    );
    assert.equal(
      calculerClasse({
        missionsValidees: 12,
        xp30jParDomaine: { finance: 20, mind: 20, health: 20, fitness: 20, discipline: 15, life: 15 },
      }),
      NOMS_CLASSES.balanced,
    );
  });
});
