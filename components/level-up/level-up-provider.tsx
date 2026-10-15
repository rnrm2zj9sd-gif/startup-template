"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useProfile } from "@/lib/profile-store";
import { TIERS } from "@/lib/tiers";
import { LevelUpOverlay, type LevelUpEvent } from "./level-up-overlay";

interface LevelUpContextValue {
  /** Déclenche manuellement l'animation (ex. bouton de test). */
  triggerLevelUp: (fromLevel: number, toLevel: number) => void;
  /** Aperçu de l'animation complète d'un palier (galerie « Progression visuelle »). */
  previewTier: (tierIndex: number) => void;
}

const LevelUpContext = createContext<LevelUpContextValue | null>(null);

/**
 * Surveille le niveau du profil : à chaque hausse, joue l'animation du palier atteint
 * (version complète si le joueur change de palier). À placer sous <ProfileProvider>.
 */
export function LevelUpProvider({ children }: { children: ReactNode }) {
  const { profile, hydrated } = useProfile();
  const [event, setEvent] = useState<LevelUpEvent | null>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const level = profile.level;
    if (previous.current !== null && level > previous.current) {
      setEvent({ id: Date.now(), fromLevel: previous.current, toLevel: level, gender: profile.gender });
    }
    previous.current = level;
  }, [hydrated, profile.level, profile.gender]);

  const triggerLevelUp = useCallback(
    (fromLevel: number, toLevel: number) => setEvent({ id: Date.now(), fromLevel, toLevel, gender: profile.gender }),
    [profile.gender],
  );

  const previewTier = useCallback(
    (tierIndex: number) => {
      const t = TIERS[tierIndex];
      if (!t) return;
      const from = tierIndex > 0 ? t.min - 1 : t.min;
      setEvent({ id: Date.now(), fromLevel: from, toLevel: t.min, gender: profile.gender, forceTier: true });
    },
    [profile.gender],
  );

  const value = useMemo(() => ({ triggerLevelUp, previewTier }), [triggerLevelUp, previewTier]);

  return (
    <LevelUpContext.Provider value={value}>
      {children}
      <LevelUpOverlay event={event} onClose={() => setEvent(null)} />
    </LevelUpContext.Provider>
  );
}

export function useLevelUp(): LevelUpContextValue {
  const ctx = useContext(LevelUpContext);
  if (!ctx) throw new Error("useLevelUp doit être utilisé dans un <LevelUpProvider>.");
  return ctx;
}
