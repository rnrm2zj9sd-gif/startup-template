import type { UserProfile } from "@/types/player";

/**
 * Utilisateur de démonstration.
 * Sert de profil par défaut tant qu'aucun backend n'est branché ;
 * le genre et le nom choisis dans l'app sont conservés en localStorage.
 */
export const demoUser: UserProfile = {
  name: "Willys",
  gender: "male",
  level: 4,
  className: "TYCOON",
  rank: "E",
  xp: 1300,
  xpNext: 1600,
  onboardingDone: true,
};
