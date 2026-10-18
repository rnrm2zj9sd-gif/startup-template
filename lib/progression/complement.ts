// =============================================================
// Plancher de missions quotidiennes : si les compétences actives
// de l'utilisateur ne produisent pas assez de missions un jour donné,
// on complète avec de courtes missions tirées du catalogue officiel,
// hors compétences déjà choisies, pour atteindre MISSIONS_JOUR_MIN.
//
// Déterministe : même utilisateur + même jour = même tirage (seed
// userId|date), donc testable sans horloge ni aléatoire réel.
// =============================================================

import { CATALOGUE, type Competence, type Exercice } from "@/lib/moteur";
import type { ContratPersiste } from "./contrat";
import { difficulteDepuisNiveau, domaineAfficheDe } from "./generer";
import type { MissionInsert } from "./types";
import { calculerXpMission } from "./xp";

/** Nombre minimum de missions "daily" visées chaque jour, toutes compétences confondues. */
export const MISSIONS_JOUR_MIN = 3;

/** Durée fixe des missions de complément : courtes par construction. */
const MINUTES_COMPLEMENT = 5;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Même PRNG reproductible que `lib/moteur/moteur.ts` (dupliqué ici, non exporté là-bas). */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un exercice de niveau 1, sans matériel particulier : toujours faisable, jamais bloqué. */
function exerciceDepartDe(competence: Competence): Exercice | undefined {
  const accessible = (e: Exercice) =>
    e.niveau === 1 && e.materiel.every((m) => m === "aucun" || m === "papier_stylo" || m === "telephone");
  return competence.exercices.find((e) => accessible(e) && e.versionPlancher) ?? competence.exercices.find(accessible);
}

/**
 * Tire, sans remise et de façon déterministe, `manque` compétences du catalogue
 * officiel hors `competencesExclues`, et construit pour chacune une mission courte.
 */
export function missionsComplementaires(input: {
  userId: string;
  date: string;
  /** Missions "daily" déjà prévues aujourd'hui (existantes + sur le point d'être insérées). */
  totalMissionsDuJour: number;
  competencesExclues: string[];
  chaineJours: number;
  catalog?: ContratPersiste | null;
}): MissionInsert[] {
  const manque = Math.max(0, MISSIONS_JOUR_MIN - input.totalMissionsDuJour);
  if (manque <= 0) return [];

  const exclues = new Set(input.competencesExclues);
  const pool = Object.values(CATALOGUE).filter((c) => !exclues.has(c.id));
  const alea = rng(`${input.userId}|complement|${input.date}`);

  const tirage: Competence[] = [];
  const reste = [...pool];
  while (tirage.length < manque && reste.length) {
    const i = Math.floor(alea() * reste.length);
    tirage.push(reste.splice(i, 1)[0]);
  }

  return tirage.flatMap((competence) => {
    const exercice = exerciceDepartDe(competence);
    if (!exercice) return [];
    const difficulte = difficulteDepuisNiveau(exercice.niveau);
    const xp = calculerXpMission(
      { dureeMin: MINUTES_COMPLEMENT, difficulte, prevue: false, perso: false },
      { chaineJours: input.chaineJours },
    );
    return [
      {
        user_id: input.userId,
        date_locale: input.date,
        type: "daily" as const,
        domaine: domaineAfficheDe(competence.id, input.catalog ?? null),
        competence_id: competence.id,
        titre: `${competence.nom} : ${exercice.nom}`,
        description: exercice.versionPlancher ?? exercice.consigne,
        duree_min: MINUTES_COMPLEMENT,
        difficulte,
        payload: {
          source: "complement",
          prevue: false,
          perso: false,
          focusIds: [exercice.focusId],
          exerciceId: exercice.id,
          exerciceIds: [exercice.id],
        },
        xp_prevu: xp,
        statut: "a_faire" as const,
      },
    ];
  });
}
