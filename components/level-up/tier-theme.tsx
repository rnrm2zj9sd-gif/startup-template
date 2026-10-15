"use client";

import { useEffect } from "react";
import { useProfile } from "@/lib/profile-store";
import { getTier } from "@/lib/tiers";

/**
 * Colore toute l'interface avec la couleur du palier du joueur :
 * remplace --primary, --ring, --accent et --sidebar-primary, et expose --tier / --tier-rgb / --tier-on.
 * Les composants qui utilisent déjà `bg-primary`, `text-primary`, `ring`… suivent automatiquement.
 * `level` permet de forcer un palier (aperçu) ; sinon on lit le niveau du profil.
 */
export function TierTheme({ level }: { level?: number }) {
  const { profile, hydrated } = useProfile();
  const lvl = level ?? profile.level;
  const ready = level !== undefined || hydrated;

  useEffect(() => {
    if (!ready) return;
    const t = getTier(lvl);
    const root = document.documentElement;
    const vars: Record<string, string> = {
      "--tier": t.color,
      "--tier-rgb": t.rgb,
      "--tier-on": t.onColor,
      "--primary": t.color,
      "--primary-foreground": t.onColor,
      "--ring": t.color,
      "--accent": `rgba(${t.rgb}, 0.15)`,
      "--accent-foreground": t.color,
      "--sidebar-primary": t.color,
      "--sidebar-primary-foreground": t.onColor,
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.tier = t.key;
    return () => {
      Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      delete root.dataset.tier;
    };
  }, [lvl, ready]);

  return null;
}
