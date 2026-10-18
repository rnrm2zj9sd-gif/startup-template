import {
  CATALOGUE,
  etatInitial,
  planifierSemaine,
  type EtatUtilisateur,
  type SeancePrevue,
} from "@/lib/moteur";
import { jourLocal } from "@/lib/temps";
import { DOMAINE_MOTEUR_VERS_AFFICHE, type DomaineAffiche } from "./config";
import { profilDepuisLignes, type ContratPersiste } from "./contrat";
import { decalerJour } from "./snapshot";
import type { MissionInsert } from "./types";

export function domaineAfficheDe(competenceId: string, catalog?: ContratPersiste | null): DomaineAffiche {
  const domaine = CATALOGUE[competenceId]?.domaine;
  if (domaine && DOMAINE_MOTEUR_VERS_AFFICHE[domaine]) return DOMAINE_MOTEUR_VERS_AFFICHE[domaine];
  const perso = catalog?.catalogPerso?.competences.find((c) => c.id === competenceId);
  if (perso && DOMAINE_MOTEUR_VERS_AFFICHE[perso.domaine]) return DOMAINE_MOTEUR_VERS_AFFICHE[perso.domaine];
  return "life";
}

export function difficulteDepuisNiveau(niveau: number): "facile" | "moyen" | "difficile" {
  if (niveau >= 4) return "difficile";
  if (niveau <= 1) return "facile";
  return "moyen";
}

function niveauExercice(competenceId: string, exerciceId: string, catalog?: ContratPersiste | null): number {
  const off = CATALOGUE[competenceId]?.exercices.find((x) => x.id === exerciceId);
  if (off) return off.niveau;
  const perso = catalog?.catalogPerso?.exercices.find((e) => e.id === exerciceId);
  if (perso?.difficulte === "facile") return 1;
  if (perso?.difficulte === "difficile") return 3;
  return 2;
}

export function ligneDepuisSeance(input: {
  userId: string;
  seance: SeancePrevue;
  type?: "daily" | "weekly";
  catalog?: ContratPersiste | null;
}): MissionInsert {
  const { seance, userId, catalog } = input;
  const niveaux = seance.exercices.map((e) => niveauExercice(seance.competenceId, e.exerciceId, catalog));
  const niveauMoyen = niveaux.length ? niveaux.reduce((a, b) => a + b, 0) / niveaux.length : 2;
  const exerciceIds = seance.exercices.map((e) => e.exerciceId);

  return {
    user_id: userId,
    date_locale: seance.date,
    type: input.type ?? "daily",
    domaine: domaineAfficheDe(seance.competenceId, catalog),
    competence_id: seance.competenceId,
    titre: `${seance.competence} : ${seance.focusNoms.join(" + ")}`,
    description: seance.missionPlancher,
    duree_min: Math.max(2, Math.round(seance.minutesTotal)),
    difficulte: difficulteDepuisNiveau(niveauMoyen),
    payload: {
      source: "moteur",
      prevue: true,
      perso: seance.exercices.some((e) => e.perso),
      focusIds: seance.focusIds,
      niveauMoyen,
      exerciceId: exerciceIds[0] ?? null,
      exerciceIds,
      seance,
    },
    xp_prevu: seance.xpEstime,
    statut: "a_faire" as const,
  };
}

export function etatDepuisProgression(input: {
  progress: { competence_id: string; focus_id: string; niveau: number; palier: number }[];
  historique: { date: string; competence_id: string; payload: Record<string, unknown> | null; ressenti?: string }[];
  chaineJours: number;
}): EtatUtilisateur {
  const etat = etatInitial();
  etat.chaineJours = input.chaineJours;
  for (const p of input.progress) {
    etat.progression[`${p.competence_id}:${p.focus_id}`] = { niveau: p.niveau, palier: p.palier };
  }
  for (const h of input.historique) {
    const seance = h.payload?.seance as SeancePrevue | undefined;
    etat.historique.push({
      date: h.date,
      competenceId: h.competence_id,
      focusIds: seance?.focusIds ?? ((h.payload?.focusIds as string[]) ?? []),
      exerciceIds: seance?.exercices.map((e) => e.exerciceId) ?? [],
      ressenti: (h.ressenti as EtatUtilisateur["historique"][number]["ressenti"]) ?? "bien",
    });
  }
  return etat;
}

export function planDuJour(input: {
  userId: string;
  timezone: string;
  now?: Date;
  choix: {
    competence_id: string;
    focus_ids: string[] | null;
    seances_semaine: number | null;
    minutes_max: number | null;
    mode?: string | null;
    mode_en_vigueur?: string | null;
  }[];
  catalog: ContratPersiste | null;
  etat: EtatUtilisateur;
}) {
  const date = jourLocal(input.now ?? new Date(), input.timezone || "Europe/Paris");
  const profil = profilDepuisLignes({
    userId: input.userId,
    choix: input.choix,
    catalog: input.catalog,
  });
  const semaine = profil.choix.length ? planifierSemaine(profil, input.etat, CATALOGUE, date) : [];
  return { date, semaine, jour: semaine.find((j) => j.date === date) ?? null };
}

export function fenetreSemaine(date: string): { debut: string; fin: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  const debut = decalerJour(date, -dow);
  return { debut, fin: decalerJour(debut, 6) };
}
