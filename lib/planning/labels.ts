import { DOMAINE_LABELS, type DomaineAffiche } from "@/lib/progression/config";
import type { PlanningDifficulte, PlanningKind, PlanningStatut, PlanningVue } from "./types";

export const KIND_LABELS: Record<PlanningKind, string> = {
  productive: "Tâche",
  personnel: "Événement",
  pause: "Pause",
};

export const STATUT_LABELS: Record<PlanningStatut, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  reportee: "Reportée",
  annulee: "Annulée",
};

export const DIFF_LABELS: Record<PlanningDifficulte, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

export const VUE_LABELS: Record<PlanningVue, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
};

export function labelPilier(id: DomaineAffiche | null): string {
  return id ? DOMAINE_LABELS[id] : "—";
}
