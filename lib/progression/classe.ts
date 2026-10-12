import { CLASSE_DOMINANT_SEUIL, CLASSE_MISSIONS_MIN, DOMAINE_AFFICHE, NOMS_CLASSES, type DomaineAffiche } from "./config";

export function calculerClasse(input: {
  missionsValidees: number;
  xp30jParDomaine: Partial<Record<DomaineAffiche, number>>;
}): string {
  if (input.missionsValidees < CLASSE_MISSIONS_MIN) return NOMS_CLASSES.initie;

  const total = DOMAINE_AFFICHE.reduce((acc, d) => acc + (input.xp30jParDomaine[d] ?? 0), 0);
  if (total <= 0) return NOMS_CLASSES.balanced;

  let meilleur: DomaineAffiche = DOMAINE_AFFICHE[0];
  let max = -1;
  for (const d of DOMAINE_AFFICHE) {
    const v = input.xp30jParDomaine[d] ?? 0;
    if (v > max) {
      max = v;
      meilleur = d;
    }
  }

  if (max / total <= CLASSE_DOMINANT_SEUIL) return NOMS_CLASSES.balanced;
  return NOMS_CLASSES[meilleur];
}
