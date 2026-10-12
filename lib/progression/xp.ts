import { calculerXP } from "@/lib/moteur";
import {
  CHAINE_BONUS_MAX,
  CHAINE_PAS,
  DIFFICULTE_VERS_NIVEAU,
  ENGAGEMENT_PREVUE,
  MINUTES_XP_MAX,
  MINUTES_XP_MIN,
  PERSO_MINUTES_MAX,
  XP_JOUR_MAX,
  XP_PERSO_PART_MAX,
} from "./config";

export type MissionXpInput = {
  dureeMin: number;
  difficulte: string;
  prevue: boolean;
  perso: boolean;
};

export function difficulteVersNiveau(difficulte: string): number {
  return DIFFICULTE_VERS_NIVEAU[difficulte] ?? 2;
}

/** Réutilise `calculerXP` : minutes 5–60 × difficulté × 1,25 si prévue × chaîne ≤ 1,3. */
export function calculerXpMission(mission: MissionXpInput, contexte: { chaineJours: number }): number {
  const minutes = mission.perso ? Math.min(PERSO_MINUTES_MAX, mission.dureeMin) : mission.dureeMin;
  const niveau = difficulteVersNiveau(mission.difficulte);
  let xp = calculerXP(minutes, niveau, contexte.chaineJours);
  if (!mission.prevue) {
    xp = Math.round(xp / ENGAGEMENT_PREVUE);
  }
  return xp;
}

export function bonusChaine(chaineJours: number): number {
  return Math.min(CHAINE_BONUS_MAX, 1 + CHAINE_PAS * chaineJours);
}

export function appliquerPlafondQuotidien(input: {
  xpBrut: number;
  xpDejaDuJour: number;
  xpPersoDejaDuJour: number;
  estPerso: boolean;
}): { xp: number; plafond: "quotidien" | "perso" | null } {
  const restantJour = Math.max(0, XP_JOUR_MAX - input.xpDejaDuJour);
  let xp = Math.min(Math.max(0, input.xpBrut), restantJour);
  let plafond: "quotidien" | "perso" | null = input.xpBrut > restantJour ? "quotidien" : null;

  if (input.estPerso && xp > 0) {
    const officiel = input.xpDejaDuJour - input.xpPersoDejaDuJour;
    const persoMax =
      officiel <= 0
        ? Math.floor(XP_PERSO_PART_MAX * XP_JOUR_MAX) - input.xpPersoDejaDuJour
        : Math.floor((3 * officiel) / 2) - input.xpPersoDejaDuJour;
    const persoAutorise = Math.max(0, persoMax);
    if (xp > persoAutorise) {
      xp = persoAutorise;
      plafond = "perso";
    }
  }

  return { xp, plafond };
}

export function minutesPourXp(minutes: number): number {
  return Math.min(MINUTES_XP_MAX, Math.max(MINUTES_XP_MIN, minutes));
}
