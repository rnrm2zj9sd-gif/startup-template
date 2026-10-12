import { DISCIPLINE_JOUR_COMPLET, DISCIPLINE_JOUR_PARTIEL, DISCIPLINE_JOUR_VIDE, DISCIPLINE_JOURS } from "./config";

export type JourDiscipline = { prevues: number; terminees: number };

export function indiceDeDiscipline(jours: JourDiscipline[]): number {
  const slice = jours.slice(-DISCIPLINE_JOURS);
  while (slice.length < DISCIPLINE_JOURS) slice.unshift({ prevues: 0, terminees: 0 });

  let points = 0;
  for (const j of slice) {
    if (j.prevues <= 0) points += DISCIPLINE_JOUR_VIDE;
    else if (j.terminees >= j.prevues) points += DISCIPLINE_JOUR_COMPLET;
    else if (j.terminees > 0) points += DISCIPLINE_JOUR_PARTIEL;
    else points += DISCIPLINE_JOUR_VIDE;
  }

  const max = DISCIPLINE_JOURS * DISCIPLINE_JOUR_COMPLET;
  return Math.round((100 * points) / max);
}
