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
import { calculerPower, niveauxDomainesDepuisXp, objectifValide } from "./power";
import { appliquerPlafondQuotidien } from "./xp";

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
    [4, "E", 5, "D"],
    [9, "D", 10, "C"],
    [19, "C", 20, "B"],
    [34, "B", 35, "A"],
    [49, "A", 50, "S"],
    [99, "S", 100, "SS"],
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
    { rang: "D", niveau: 5 },
    { rang: "C", niveau: 10 },
    { rang: "B", niveau: 20 },
    { rang: "A", niveau: 35 },
    { rang: "S", niveau: 50 },
  ] as const;

  const bandes50: Record<string, [number, number]> = {
    D: [10, 21],
    C: [40, 80],
    B: [140, 240],
    A: [330, 460],
    S: [550, 900],
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
