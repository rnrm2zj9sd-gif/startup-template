import { DOMAINE_AFFICHE, OBJECTIF_MISSIONS_MIN, POWER_PAR_NIVEAU_DOMAINE, POWER_PAR_OBJECTIF_VALIDE, type DomaineAffiche } from "./config";
import { niveauDepuisXp } from "./niveau";

export function niveauxDomainesDepuisXp(xpParDomaine: Partial<Record<DomaineAffiche, number>>): Record<DomaineAffiche, number> {
  const out = {} as Record<DomaineAffiche, number>;
  for (const d of DOMAINE_AFFICHE) {
    const xp = xpParDomaine[d] ?? 0;
    out[d] = xp > 0 ? niveauDepuisXp(xp) : 0;
  }
  return out;
}

export function objectifValide(missionsTermineesLiees: number): boolean {
  return missionsTermineesLiees >= OBJECTIF_MISSIONS_MIN;
}

export function calculerPower(input: {
  niveauxDomaines: Record<DomaineAffiche, number> | Partial<Record<DomaineAffiche, number>>;
  objectifsValides: number;
}): number {
  const somme = DOMAINE_AFFICHE.reduce((acc, d) => acc + (input.niveauxDomaines[d] ?? 0), 0);
  return POWER_PAR_NIVEAU_DOMAINE * somme + POWER_PAR_OBJECTIF_VALIDE * input.objectifsValides;
}
