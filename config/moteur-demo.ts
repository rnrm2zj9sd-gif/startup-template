import { catalogPersoDemo } from "@/lib/moteur/catalogue-perso-demo";
import type { Profil } from "@/lib/moteur";

export { catalogPersoDemo };

/** Profil de démo : même contrat que `exemple-sortie_1.txt`, plus la couche perso. */
export const demoMoteurProfil: Profil = {
  userId: "demo-willy",
  materiel: ["aucun", "papier_stylo", "telephone"],
  budgetMinutesJour: 45,
  catalogPerso: catalogPersoDemo,
  choix: [
    {
      competenceId: "musculation",
      focusIds: ["abdos", "epaules", "bras", "dos", "avant-bras"],
      seancesParSemaine: 5,
      minutesMax: 15,
    },
    {
      competenceId: "education-financiere",
      focusIds: ["suivi", "culture-finance", "budget"],
      seancesParSemaine: 3,
      minutesMax: 10,
    },
    {
      competenceId: "passage-action",
      focusIds: ["planification", "procrastination"],
      seancesParSemaine: 5,
      minutesMax: 10,
    },
    {
      competenceId: "cours",
      focusIds: ["maths", "anglais", "comptabilite"],
      seancesParSemaine: 5,
      minutesMax: 20,
    },
    {
      competenceId: "guitare",
      focusIds: [],
      seancesParSemaine: 3,
      minutesMax: 15,
    },
  ],
};
