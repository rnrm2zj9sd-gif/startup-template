import type { Rank } from "@/types/player";
import { RANG_SEUILS, XP_COURBE_EXPOSANT, XP_COURBE_FACTEUR } from "./config";

export function xpPourNiveau(n: number): number {
  if (n < 1) return 0;
  return Math.round(XP_COURBE_FACTEUR * n ** XP_COURBE_EXPOSANT);
}

export function xpCumulePourAtteindre(niveau: number): number {
  let total = 0;
  for (let n = 1; n < niveau; n++) total += xpPourNiveau(n);
  return total;
}

export function niveauDepuisXp(xpTotal: number): number {
  let rest = Math.max(0, Math.floor(xpTotal));
  let niveau = 1;
  while (rest >= xpPourNiveau(niveau)) {
    rest -= xpPourNiveau(niveau);
    niveau += 1;
  }
  return niveau;
}

export function rangDepuisNiveau(niveau: number): Rank {
  for (const seuil of RANG_SEUILS) {
    if (niveau >= seuil.niveau) return seuil.rang;
  }
  return "E";
}

export function progressionVersNiveauSuivant(xpTotal: number): {
  niveau: number;
  xpDansNiveau: number;
  xpPourSuivant: number;
} {
  const niveau = niveauDepuisXp(xpTotal);
  const xpDansNiveau = Math.max(0, Math.floor(xpTotal) - xpCumulePourAtteindre(niveau));
  return { niveau, xpDansNiveau, xpPourSuivant: xpPourNiveau(niveau) };
}
