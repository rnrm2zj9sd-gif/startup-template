import type { Rank } from "@/types/player";
import type { DomaineAffiche } from "./config";

export type PlafondXp = "quotidien" | "perso" | null;

export type MissionRow = {
  id: string;
  user_id: string;
  date_locale: string;
  type: "daily" | "weekly" | "main" | "side";
  domaine: DomaineAffiche;
  competence_id: string;
  titre: string;
  description: string;
  duree_min: number;
  difficulte: string;
  payload: Record<string, unknown>;
  xp_prevu: number;
  statut: "a_faire" | "terminee" | "annulee";
  goal_id: string | null;
};

export type ValidateMissionResult = {
  xp: number;
  xpBrut: number;
  plafond: PlafondXp;
  plafondMessage: string | null;
  niveauAvant: number;
  niveauApres: number;
  rangAvant: Rank;
  rangApres: Rank;
  missionId: string;
};

export type ProgressionSnapshot = {
  xpTotal: number;
  niveau: number;
  xpDansNiveau: number;
  xpPourSuivant: number;
  rang: Rank;
  power: number;
  classe: string;
  discipline: number;
  chaineJours: number;
  missionsValidees: number;
  xpParDomaine: Record<DomaineAffiche, number>;
  niveauxDomaines: Record<DomaineAffiche, number>;
};
