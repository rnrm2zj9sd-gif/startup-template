import type { DomaineAffiche } from "@/lib/progression/config";
import type { CalendarEvent, PlanningDifficulte, PlanningKind, PlanningStatut } from "./types";

type Row = Record<string, unknown>;

export function mapEvent(row: Row): CalendarEvent {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    titre: String(row.titre ?? ""),
    description: String(row.description ?? ""),
    kind: row.kind as PlanningKind,
    domaine: (row.domaine as DomaineAffiche | null) ?? null,
    difficulte: (row.difficulte as PlanningDifficulte | null) ?? null,
    start_at: String(row.start_at),
    end_at: String(row.end_at),
    statut: row.statut as PlanningStatut,
    mission_id: row.mission_id ? String(row.mission_id) : null,
    xp_prevu: Number(row.xp_prevu ?? 0),
    xp_gagne: row.xp_gagne == null ? null : Number(row.xp_gagne),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
  };
}
