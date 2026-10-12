import type { GoalId, TimeOptionId } from "@/config/onboarding-data";

export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "SS";

export type Gender = "male" | "female";

export interface InitiationProfile {
  primary: GoalId;
  secondary: GoalId[];
  skillKeys: string[];
  time: TimeOptionId;
  customMinutes: number;
  days: number[];
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
