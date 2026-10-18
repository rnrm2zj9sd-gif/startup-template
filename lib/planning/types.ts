import type { DomaineAffiche } from "@/lib/progression/config";

export const PLANNING_KINDS = ["productive", "personnel", "pause"] as const;
export type PlanningKind = (typeof PLANNING_KINDS)[number];

export const PLANNING_STATUTS = ["planifiee", "en_cours", "terminee", "reportee", "annulee"] as const;
export type PlanningStatut = (typeof PLANNING_STATUTS)[number];

export const PLANNING_DIFFICULTES = ["facile", "moyen", "difficile"] as const;
export type PlanningDifficulte = (typeof PLANNING_DIFFICULTES)[number];

export const PLANNING_VUES = ["jour", "semaine", "mois"] as const;
export type PlanningVue = (typeof PLANNING_VUES)[number];

export type CalendarEvent = {
  id: string;
  user_id: string;
  titre: string;
  description: string;
  kind: PlanningKind;
  domaine: DomaineAffiche | null;
  difficulte: PlanningDifficulte | null;
  start_at: string;
  end_at: string;
  statut: PlanningStatut;
  mission_id: string | null;
  xp_prevu: number;
  xp_gagne: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type PlanningMission = {
  id: string;
  titre: string;
  description: string;
  date_locale: string;
  domaine: DomaineAffiche;
  duree_min: number;
  difficulte: string;
  xp_prevu: number;
  xp_gagne: number;
  statut: "a_faire" | "terminee" | "annulee";
  type: string;
};

export type PlanningFiltre = {
  kind: "tous" | PlanningKind;
  statut: "tous" | "ouvertes" | "terminees";
  domaine: "tous" | DomaineAffiche;
};

export type PlanningStats = {
  planifiees: number;
  terminees: number;
  reportees: number;
  annulees: number;
  xpPotentielle: number;
  xpGagnee: number;
  taux: number | null;
  minutesPlanifiees: number;
  minutesTerminees: number;
  minutesOccupees: number;
};

export type PlanningChevauchement = { idA: string; idB: string };

export type TerminerPlanningResult = {
  xp: number;
  xpBrut?: number;
  plafond?: string | null;
  plafondMessage?: string | null;
  missionId?: string | null;
  eventId?: string;
  deja?: boolean;
  niveauAvant?: number;
  niveauApres?: number;
};
