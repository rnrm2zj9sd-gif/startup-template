import { DOMAINE_AFFICHE, type DomaineAffiche } from "@/lib/progression/config";
import { calculerXpMission } from "@/lib/progression/xp";
import {
  PLANNING_DIFFICULTES,
  PLANNING_KINDS,
  type PlanningDifficulte,
  type PlanningKind,
} from "./types";

export type BrouillonPlanning = {
  titre: string;
  description?: string;
  kind: PlanningKind;
  domaine?: DomaineAffiche | null;
  difficulte?: PlanningDifficulte | null;
  startAt: Date;
  endAt: Date;
};

export function estKind(v: unknown): v is PlanningKind {
  return typeof v === "string" && (PLANNING_KINDS as readonly string[]).includes(v);
}

export function estDifficulte(v: unknown): v is PlanningDifficulte {
  return typeof v === "string" && (PLANNING_DIFFICULTES as readonly string[]).includes(v);
}

export function estDomaine(v: unknown): v is DomaineAffiche {
  return typeof v === "string" && (DOMAINE_AFFICHE as readonly string[]).includes(v);
}

export function minutesEntre(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/** XP potentielle : formule centrale, jamais un barème parallèle. */
export function xpPotentielle(input: {
  kind: PlanningKind;
  dureeMin: number;
  difficulte?: PlanningDifficulte | null;
}): number {
  if (input.kind !== "productive") return 0;
  return calculerXpMission(
    {
      dureeMin: input.dureeMin,
      difficulte: input.difficulte ?? "moyen",
      prevue: true,
      perso: false,
    },
    { chaineJours: 0 },
  );
}

export function validerBrouillon(input: BrouillonPlanning): string | null {
  const titre = input.titre.trim();
  if (titre.length < 1 || titre.length > 80) return "Le titre doit faire entre 1 et 80 caractères.";
  if ((input.description ?? "").length > 2000) return "La description est trop longue.";
  if (!estKind(input.kind)) return "Type d'élément invalide.";
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) return "Date de début invalide.";
  if (!(input.endAt instanceof Date) || Number.isNaN(input.endAt.getTime())) return "Date de fin invalide.";
  if (input.endAt.getTime() <= input.startAt.getTime()) return "L'heure de fin doit être après le début.";
  if (minutesEntre(input.startAt, input.endAt) < 1) return "La durée doit être d'au moins une minute.";
  if (input.kind === "productive") {
    if (!estDomaine(input.domaine)) return "Choisis un pilier.";
    if (!estDifficulte(input.difficulte)) return "Choisis une difficulté.";
  }
  return null;
}
