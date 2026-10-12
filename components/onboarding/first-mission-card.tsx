"use client";

import { FIRST_MISSIONS } from "@/config/onboarding-data";
import { recapInitiation } from "@/lib/onboarding";
import { useMoteur } from "@/lib/moteur-store";
import { useProfile } from "@/lib/profile-store";

/** Mission d'initiation affichée tant que l'utilisateur n'a pas encore validé de séance. */
export function FirstMissionCard() {
  const { profile } = useProfile();
  const { etat } = useMoteur();
  const init = profile.initiation;
  if (!profile.onboardingDone || !init) return null;
  if (etat.historique.some((s) => s.ressenti !== "pas_fait")) return null;
  const recap = recapInitiation({
    primary: init.primary,
    secondary: init.secondary,
    answers: {},
    skillKeys: init.skillKeys,
    time: init.time,
    customMinutes: init.customMinutes,
    days: init.days,
  });
  const mission = FIRST_MISSIONS[init.primary];
  if (!recap) return null;

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 md:p-6">
      <p className="text-xs tracking-[0.3em] text-muted-foreground">PREMIÈRE MISSION</p>
      <h2 className="mt-3 text-lg font-semibold">{mission.title}</h2>
      <p className="mt-2 text-sm">{mission.objective}</p>
      <p className="mt-3 text-xs text-muted-foreground">{mission.why}</p>
      <p className="mt-4 font-mono text-sm tabular-nums text-brand-gold">
        {recap.minutes} min · +{recap.xp} XP · {mission.skill}
      </p>
    </section>
  );
}
