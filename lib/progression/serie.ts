// =============================================================
// Séries de jours (streaks) — miroir exact de public.serie_depuis_jours.
//
// Jour validé : au moins une mission validée qui rapporte de l'XP ce
// jour-là (jour local du joueur). La série compte les jours validés
// consécutifs.
//   · 7 jours validés d'affilée = 1 bouclier (stock max 2).
//   · Jour manqué : un bouclier est consommé et la série est conservée ;
//     sans bouclier, la série est divisée par 2 (arrondi inférieur).
//   · Aujourd'hui ne compte comme manqué qu'une fois la journée finie.
//   · Bonus XP : +2 % par jour de série d'hier, plafonné à +30 %.
// =============================================================

export const SERIE_PALIERS = [3, 7, 14, 30, 60, 100, 180, 365] as const;
export const JOURS_PAR_BOUCLIER = 7;
export const BOUCLIERS_MAX = 2;
export const BONUS_XP_PCT_PAR_JOUR = 2;
export const BONUS_XP_PCT_MAX = 30;

export type EvenementSerie =
  | { type: "bouclier"; jour: string; serie: number }
  | { type: "moitie"; jour: string; avant: number; apres: number };

export type SerieEtat = {
  /** Série affichée : celle d'hier, +1 si aujourd'hui est déjà validé. */
  serie: number;
  /** Série à la fin d'hier : sert au bonus XP du jour. */
  serieHier: number;
  aujourdHuiValide: boolean;
  boucliers: number;
  bouclierMax: number;
  /** Jours validés d'affilée qui manquent avant le prochain bouclier. */
  joursVersBouclier: number;
  bouclierGagneAujourdhui: boolean;
  record: number;
  nouveauRecord: boolean;
  /** Dernier jour manqué traité (bouclier consommé ou série divisée). */
  dernierEvenement: EvenementSerie | null;
  /** Vrai si ce dernier jour manqué est hier : l'écran peut l'annoncer. */
  evenementHier: boolean;
  prochainPalier: number | null;
  bonusXpPct: number;
};

/** Décale un jour ISO (AAAA-MM-JJ) de `n` jours, sans dépendre du fuseau de la machine. */
function decaler(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const jourSuivant = (iso: string) => decaler(iso, 1);

export function etatSerie(joursValides: Iterable<string>, aujourdHui: string): SerieEtat {
  const jours = new Set([...joursValides].filter((j) => j <= aujourdHui));
  const tries = [...jours].sort();
  const premier = tries.at(0);

  let serie = 0;
  let boucliers = 0;
  let compteur = 0;
  let record = 0;
  let dernierEvenement: EvenementSerie | null = null;

  if (premier !== undefined) {
    for (let d = premier; d < aujourdHui; d = jourSuivant(d)) {
      if (jours.has(d)) {
        serie += 1;
        compteur += 1;
        if (compteur >= JOURS_PAR_BOUCLIER) {
          boucliers = Math.min(BOUCLIERS_MAX, boucliers + 1);
          compteur = 0;
        }
        record = Math.max(record, serie);
      } else {
        if (serie > 0) {
          if (boucliers > 0) {
            boucliers -= 1;
            dernierEvenement = { type: "bouclier", jour: d, serie };
          } else {
            const apres = Math.floor(serie / 2);
            dernierEvenement = { type: "moitie", jour: d, avant: serie, apres };
            serie = apres;
          }
        }
        compteur = 0;
      }
    }
  }

  const serieHier = serie;
  const aujourdHuiValide = jours.has(aujourdHui);
  let bouclierGagneAujourdhui = false;
  let nouveauRecord = false;

  if (aujourdHuiValide) {
    serie += 1;
    compteur += 1;
    if (compteur >= JOURS_PAR_BOUCLIER) {
      bouclierGagneAujourdhui = boucliers < BOUCLIERS_MAX;
      boucliers = Math.min(BOUCLIERS_MAX, boucliers + 1);
      compteur = 0;
    }
    nouveauRecord = serie > record;
    record = Math.max(record, serie);
  }

  return {
    serie,
    serieHier,
    aujourdHuiValide,
    boucliers,
    bouclierMax: BOUCLIERS_MAX,
    joursVersBouclier: JOURS_PAR_BOUCLIER - compteur,
    bouclierGagneAujourdhui,
    record,
    nouveauRecord,
    dernierEvenement,
    evenementHier: dernierEvenement !== null && dernierEvenement.jour === decaler(aujourdHui, -1),
    prochainPalier: SERIE_PALIERS.find((p) => p > serie) ?? null,
    bonusXpPct: Math.min(BONUS_XP_PCT_MAX, BONUS_XP_PCT_PAR_JOUR * serieHier),
  };
}
