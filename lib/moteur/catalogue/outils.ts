import type { Dosage, Exercice, Materiel } from "../types";

/** Répétitions : séries × (base + palier × inc) */
export const R = (series: number, base: number, inc: number, reposSec = 45): Dosage => ({ type: "repetitions", series, base, increment: inc, reposSec });
/** Durée en secondes : séries × (base + palier × inc) s */
export const D = (series: number, base: number, inc: number, reposSec = 30): Dosage => ({ type: "duree", series, base, increment: inc, reposSec });
/** Action en minutes : base + palier × inc */
export const A = (minutes: number, inc = 0): Dosage => ({ type: "action", base: minutes, increment: inc });

export const ex = (
  focusId: string,
  id: string,
  nom: string,
  niveau: Exercice["niveau"],
  dosage: Dosage,
  consigne: string,
  materiel: Materiel[] = ["aucun"],
  versionPlancher?: string,
  ressource?: Exercice["ressource"],
): Exercice => ({ id, nom, focusId, niveau, dosage, consigne, materiel, versionPlancher, ressource });
