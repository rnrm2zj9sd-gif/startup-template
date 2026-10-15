import type { Rank } from "@/types/player";

/** Courbe : XP pour passer du niveau n au niveau n+1. */
export const XP_COURBE_FACTEUR = 120;
export const XP_COURBE_EXPOSANT = 0.6;

export const XP_JOUR_MAX = 400;
export const XP_PERSO_PART_MAX = 0.6;
export const PERSO_MINUTES_MAX = 30;
export const MINUTES_XP_MIN = 5;
export const MINUTES_XP_MAX = 60;
export const ENGAGEMENT_PREVUE = 1.25;
export const CHAINE_BONUS_MAX = 1.3;
export const CHAINE_PAS = 0.02;
export const PALIERS_PAR_NIVEAU = 4;
export const NIVEAU_MAX_COMPETENCE = 5;

export const POWER_PAR_NIVEAU_DOMAINE = 10;
export const POWER_PAR_OBJECTIF_VALIDE = 25;
export const OBJECTIF_MISSIONS_MIN = 3;

export const DISCIPLINE_JOURS = 14;
export const DISCIPLINE_JOUR_COMPLET = 60;
export const DISCIPLINE_JOUR_PARTIEL = 25;
export const DISCIPLINE_JOUR_VIDE = 15;

export const CLASSE_MISSIONS_MIN = 10;
export const CLASSE_DOMINANT_SEUIL = 0.3;
export const CLASSE_FENETRE_JOURS = 30;

export const DOMAINE_AFFICHE = ["finance", "mind", "health", "fitness", "discipline", "life"] as const;
export type DomaineAffiche = (typeof DOMAINE_AFFICHE)[number];

export const DOMAINE_MOTEUR_VERS_AFFICHE: Record<string, DomaineAffiche> = {
  Finance: "finance",
  "Business & Carrière": "finance",
  Physique: "fitness",
  Santé: "health",
  Mental: "mind",
  "Discipline & Productivité": "discipline",
  Connaissances: "mind",
  Social: "life",
  "Vie personnelle": "life",
  Études: "mind",
  Perso: "life",
};

/** Premier niveau auquel le rang est atteint. */
export const RANG_SEUILS: { rang: Rank; niveau: number }[] = [
  { rang: "SS", niveau: 100 },
  { rang: "S", niveau: 50 },
  { rang: "A", niveau: 35 },
  { rang: "B", niveau: 20 },
  { rang: "C", niveau: 10 },
  { rang: "D", niveau: 5 },
];

export const NOMS_CLASSES: Record<DomaineAffiche | "balanced" | "initie", string> = {
  finance: "TYCOON",
  mind: "SAGE",
  health: "VITAL",
  fitness: "ATHLETE",
  discipline: "MONK",
  life: "SOCIAL",
  balanced: "Balanced",
  initie: "Initié",
};

export const DIFFICULTE_VERS_NIVEAU: Record<string, number> = {
  facile: 1,
  moyen: 3,
  difficile: 4,
};
