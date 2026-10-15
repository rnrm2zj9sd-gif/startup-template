export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "SS";

export type Gender = "male" | "female";

export function parseGender(value: unknown): Gender | null {
  return value === "male" || value === "female" ? value : null;
}

/** Choix de l'onboarding, stockés dans `profiles.initiation`. */
export interface InitiationProfile {
  competences: { id: string; focusIds: string[] }[];
  budgetMinutes: number;
  materiel: string[];
}

/** Profil utilisateur du System (le joueur). */
export interface UserProfile {
  name: string;
  gender: Gender;
  level: number;
  /** Classe du personnage (ex. « TYCOON »). */
  className: string;
  rank: Rank;
  /** XP accumulée dans le niveau courant. */
  xp: number;
  /** XP nécessaire pour passer au niveau suivant. */
  xpNext: number;
  power?: number;
  missionsValidees?: number;
  onboardingDone: boolean;
  initiation?: InitiationProfile;
}
