/** Écart en jours civils entre deux dates ISO (b − a). */
export function ecartJours(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * Chaîne du moteur (`enregistrerResultat`) :
 * écart 1 = jour suivant, écart 2 = 1 jour manqué (chaîne conservée),
 * écart ≥ 3 = 2 jours ou plus manqués (chaîne divisée par 2, puis +1 pour le jour repris).
 */
export function chaineDepuisJours(jours: Iterable<string>): number {
  const dates = [...new Set(jours)].sort();
  let chaine = 0;
  let derniere: string | null = null;

  for (const date of dates) {
    if (!derniere) {
      chaine = 1;
    } else {
      const ecart = ecartJours(derniere, date);
      if (ecart <= 0) continue;
      if (ecart <= 2) chaine += 1;
      else chaine = Math.floor(chaine / 2) + 1;
    }
    derniere = date;
  }

  return chaine;
}
