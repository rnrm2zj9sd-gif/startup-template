// Missions du jour tirées par domaine.
// Le catalogue de départ = un exercice de niveau 1, accessible sans matériel
// particulier, par zone du catalogue officiel. Chaque jour on en tire 3 à 5,
// uniquement dans les domaines des compétences choisies.
// Même joueur + même jour = même tirage.

import { CATALOGUE, type Exercice } from "@/lib/moteur";
import { DOMAINE_AFFICHE, type DomaineAffiche } from "./config";
import type { ContratPersiste } from "./contrat";
import { difficulteDepuisNiveau, domaineAfficheDe } from "./generer";
import type { MissionInsert } from "./types";
import { calculerXpMission } from "./xp";

export const MISSIONS_JOUR_MIN = 3;
export const MISSIONS_JOUR_MAX = 5;

export type MissionDepart = {
  domaine: DomaineAffiche;
  competenceId: string;
  competenceNom: string;
  focusId: string;
  exerciceId: string;
  nom: string;
  niveau: number;
  minutes: number;
  consigne: string;
};

function accessible(e: Exercice): boolean {
  return e.niveau === 1 && e.materiel.every((m) => m === "aucun" || m === "papier_stylo" || m === "telephone");
}

function minutesDe(e: Exercice): number {
  if (e.dosage.type === "action") return Math.min(60, Math.max(2, e.dosage.base));
  return 5;
}

/** Une mission de départ par zone : la version la plus simple du catalogue officiel. */
export function catalogueDepart(): MissionDepart[] {
  const out: MissionDepart[] = [];
  for (const competence of Object.values(CATALOGUE)) {
    for (const focus of competence.focus) {
      const dansLaZone = competence.exercices.filter((e) => e.focusId === focus.id && accessible(e));
      const exercice = dansLaZone.find((e) => e.versionPlancher) ?? dansLaZone[0];
      if (!exercice) continue;
      out.push({
        domaine: domaineAfficheDe(competence.id),
        competenceId: competence.id,
        competenceNom: competence.nom,
        focusId: focus.id,
        exerciceId: exercice.id,
        nom: exercice.nom,
        niveau: exercice.niveau,
        minutes: minutesDe(exercice),
        consigne: exercice.versionPlancher ?? exercice.consigne,
      });
    }
  }
  return out;
}

const CATALOGUE_DEPART = catalogueDepart();

/** Domaines affichés des compétences choisies, dans l'ordre stable des 6 domaines. */
export function domainesChoisis(competenceIds: string[], catalog?: ContratPersiste | null): DomaineAffiche[] {
  const set = new Set(competenceIds.map((id) => domaineAfficheDe(id, catalog)));
  return DOMAINE_AFFICHE.filter((d) => set.has(d));
}

/** 1 domaine → 3 missions, 2 → 4, 3 et plus → 5. */
export function cibleMissionsDuJour(nbDomaines: number): number {
  if (nbDomaines <= 0) return 0;
  return Math.min(MISSIONS_JOUR_MAX, Math.max(MISSIONS_JOUR_MIN, nbDomaines + 2));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function melanger<T>(items: T[], alea: () => number): T[] {
  const copie = [...items];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function versLigne(mission: MissionDepart, input: { userId: string; date: string; chaineJours: number }): MissionInsert {
  const difficulte = difficulteDepuisNiveau(mission.niveau);
  return {
    user_id: input.userId,
    date_locale: input.date,
    type: "daily",
    domaine: mission.domaine,
    competence_id: mission.competenceId,
    titre: `${mission.competenceNom} : ${mission.nom}`,
    description: mission.consigne,
    duree_min: mission.minutes,
    difficulte,
    payload: {
      source: "depart",
      prevue: false,
      perso: false,
      focusIds: [mission.focusId],
      exerciceId: mission.exerciceId,
      exerciceIds: [mission.exerciceId],
    },
    xp_prevu: calculerXpMission(
      { dureeMin: mission.minutes, difficulte, prevue: false, perso: false },
      { chaineJours: input.chaineJours },
    ),
    statut: "a_faire",
  };
}

/**
 * Complète le jour jusqu'à la cible (3 à 5), en tournant sur les domaines choisis.
 * Les exercices déjà posés aujourd'hui (séance du moteur, mission déjà en base) sont écartés.
 */
export function tirerMissionsDepart(input: {
  userId: string;
  date: string;
  domaines: DomaineAffiche[];
  deja: number;
  exercicesExclus: string[];
  chaineJours: number;
}): MissionInsert[] {
  const domaines = DOMAINE_AFFICHE.filter((d) => input.domaines.includes(d));
  const manque = Math.max(0, cibleMissionsDuJour(domaines.length) - input.deja);
  if (manque <= 0 || domaines.length === 0) return [];

  const exclus = new Set(input.exercicesExclus);
  const decalage = hash(`${input.userId}|${input.date}`) % domaines.length;
  const tour = [...domaines.slice(decalage), ...domaines.slice(0, decalage)];
  const pools = new Map(
    tour.map((domaine) => [
      domaine,
      melanger(
        CATALOGUE_DEPART.filter((m) => m.domaine === domaine && !exclus.has(m.exerciceId)),
        rng(`${input.userId}|depart|${input.date}|${domaine}`),
      ),
    ]),
  );
  const curseur = new Map(tour.map((d) => [d, 0]));
  const tirees: MissionDepart[] = [];

  while (tirees.length < manque) {
    let progres = false;
    for (const domaine of tour) {
      if (tirees.length >= manque) break;
      const pool = pools.get(domaine) ?? [];
      const i = curseur.get(domaine) ?? 0;
      if (i >= pool.length) continue;
      tirees.push(pool[i]);
      curseur.set(domaine, i + 1);
      progres = true;
    }
    if (!progres) break;
  }

  return tirees.map((m) => versLigne(m, input));
}
