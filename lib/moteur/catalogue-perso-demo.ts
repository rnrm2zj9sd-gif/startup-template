import type { CataloguePerso } from "./types";

/** Exercices, zones et compétence ajoutés par l'utilisateur (démo). */
export const catalogPersoDemo: CataloguePerso = {
  competences: [
    {
      id: "guitare",
      nom: "Guitare",
      domaine: "Perso",
      focusParSeance: 1,
      focus: [
        { id: "accords", nom: "Accords", recuperationJours: 0 },
        { id: "rythme", nom: "Rythme", recuperationJours: 0 },
      ],
    },
  ],
  focus: [{ id: "avant-bras", competenceId: "musculation", nom: "Avant-bras", recuperationJours: 1 }],
  exercices: [
    {
      id: "perso-routine-abdos",
      nom: "Ma routine abdos",
      competenceId: "musculation",
      focusId: "abdos",
      difficulte: "facile",
      mesure: "minutes",
      valeur: 5,
      progression: false,
    },
    {
      id: "perso-pince-bouteille",
      nom: "Pince avec une bouteille d'eau",
      competenceId: "musculation",
      focusId: "avant-bras",
      difficulte: "moyen",
      mesure: "duree",
      valeur: 30,
      series: 3,
      progression: false,
    },
    {
      id: "perso-guitare-accords",
      nom: "Enchaîner les accords",
      competenceId: "guitare",
      focusId: "accords",
      difficulte: "facile",
      mesure: "minutes",
      valeur: 10,
      progression: true,
    },
    {
      id: "perso-guitare-rythme",
      nom: "Travailler le rythme",
      competenceId: "guitare",
      focusId: "rythme",
      difficulte: "moyen",
      mesure: "minutes",
      valeur: 15,
      progression: true,
    },
  ],
  epingles: ["perso-routine-abdos"],
  masques: ["corde"],
};
