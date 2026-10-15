import { DISCIPLINE_JOURS } from "./config";

export type DisciplineInput = {
  /** Missions prévues (daily / weekly / main) sur la fenêtre. */
  prevues: number;
  /** Parmi elles, celles terminées. */
  tenues: number;
  /** Jours avec au moins une mission terminée. */
  joursActifs: number;
  /** Missions marquées reportées. */
  reportees: number;
  /** Parmi elles, celles ensuite terminées. */
  reporteesFaites: number;
  fenetre?: number;
};

/**
 * 0–100 sur 14 jours :
 * 60 % engagements tenus, 25 % jours actifs, 15 % reportées puis faites.
 */
export function indiceDeDiscipline(input: DisciplineInput): number {
  const fenetre = input.fenetre ?? DISCIPLINE_JOURS;
  const engagements = input.prevues > 0 ? input.tenues / input.prevues : 0;
  const actifs = fenetre > 0 ? input.joursActifs / fenetre : 0;
  const reports = input.reportees > 0 ? input.reporteesFaites / input.reportees : 0;
  const score = 0.6 * engagements + 0.25 * actifs + 0.15 * reports;
  return Math.max(0, Math.min(100, Math.round(100 * score)));
}
