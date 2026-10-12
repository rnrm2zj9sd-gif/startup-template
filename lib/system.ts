import { rangDepuisNiveau } from "@/lib/progression";

export { rangDepuisNiveau as getRank };

export function getXPProgress(xp: number, xpNextLevel: number): number {
  if (xpNextLevel <= 0) return 0;
  return Math.min(Math.max((xp / xpNextLevel) * 100, 0), 100);
}

export function formatXP(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
