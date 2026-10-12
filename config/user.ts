import type { UserProfile } from "@/types/player";

/** Profil vide : le dashboard n’invente ni nom, ni XP, ni classe. */
export const emptyProfile: UserProfile = {
  name: "",
  gender: "male",
  level: 1,
  className: "",
  rank: "E",
  xp: 0,
  xpNext: 1600,
  onboardingDone: false,
};

/** Visuel de la landing uniquement — pas un compte, pas le dashboard. */
export const landingPreview: UserProfile = {
  name: "",
  gender: "male",
  level: 1,
  className: "PLAYER",
  rank: "E",
  xp: 0,
  xpNext: 1600,
  onboardingDone: true,
};
