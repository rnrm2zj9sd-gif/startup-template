import { NOMS_CLASSES, xpPourNiveau } from "@/lib/progression";
import type { UserProfile } from "@/types/player";

/** Profil vide : le dashboard n’invente ni nom, ni XP, ni classe. */
export const emptyProfile: UserProfile = {
  name: "",
  gender: "male",
  level: 1,
  className: "",
  rank: "E",
  xp: 0,
  xpNext: xpPourNiveau(1),
  onboardingDone: false,
};

/** Visuel de la landing uniquement — pas un compte, pas le dashboard. */
export const landingPreview: UserProfile = {
  name: "",
  gender: "male",
  level: 1,
  className: NOMS_CLASSES.initie,
  rank: "E",
  xp: 0,
  xpNext: xpPourNiveau(1),
  onboardingDone: true,
};
