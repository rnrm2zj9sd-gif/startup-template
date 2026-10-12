import type { Rank } from "@/types/player";

/**
 * Règles du System THEMILION.
 * Rangs par niveau : E → D (10) → C (20) → B (40) → A (60) → S (80) → SS (100).
 * Le palier d'XP augmente de 5 000 à chaque niveau.
 */
export const XP_STEP_PER_LEVEL = 5000;

export function getRank(level: number): Rank {
  if (level >= 100) return "SS";
  if (level >= 80) return "S";
  if (level >= 60) return "A";
  if (level >= 40) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

export function getXPProgress(xp: number, xpNextLevel: number): number {
  if (xpNextLevel <= 0) return 0;
  return Math.min(Math.max((xp / xpNextLevel) * 100, 0), 100);
}

export function formatXP(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
