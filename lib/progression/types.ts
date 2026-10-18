import type { Rank } from "@/types/player";
import type { DomaineAffiche } from "./config";

export type PlafondXp = "quotidien" | "perso" | null;

/** Forme commune d'une ligne à insérer dans `missions` (moteur ou complément). */
export type MissionInsert = {
  user_id: string;
  date_locale: string;
  type: "daily" | "weekly" | "main" | "side" | "first";
  domaine: DomaineAffiche;
  competence_id: string;
  titre: string;
  description: string;
  duree_min: number;
  difficulte: string;
  payload: Record<string, unknown>;
  xp_prevu: number;
  statut: "a_faire";
};

export type MissionRow = {
  id: string;
  user_id: string;
  date_locale: string;
  type: "daily" | "weekly" | "main" | "side" | "first";
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
  created_at: string;
};

export type JournalLigne = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
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
  /** Présent quand la mission était déjà validée : aucun XP, journal ni palier n'est réécrit. */
  deja?: boolean;
};

export type PowerDetail = {
  sommeNiveaux: number;
  objectifsValides: number;
};

export type DisciplineDetail = {
  score: number;
  partTenues: number;
  partActifs: number;
  partReports: number;
  tenues: number;
  prevues: number;
  joursActifs: number;
  reportees: number;
  reporteesFaites: number;
};

export type XpJour = { date: string; xp: number };

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
  powerDetail: PowerDetail;
  disciplineDetail: DisciplineDetail;
  xpParJour: XpJour[];
};
