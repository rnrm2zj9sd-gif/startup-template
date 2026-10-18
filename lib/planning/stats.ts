import type { CalendarEvent, PlanningFiltre, PlanningMission, PlanningStats } from "./types";

const OUVERTS = new Set(["planifiee", "en_cours", "reportee"]);

export function filtreEvenement(e: CalendarEvent, f: PlanningFiltre): boolean {
  if (f.kind !== "tous" && e.kind !== f.kind) return false;
  if (f.domaine !== "tous" && e.domaine !== f.domaine) return false;
  if (f.statut === "terminees" && e.statut !== "terminee") return false;
  if (f.statut === "ouvertes" && !OUVERTS.has(e.statut)) return false;
  return true;
}

export function minutesEvent(e: Pick<CalendarEvent, "start_at" | "end_at">): number {
  return Math.max(0, Math.round((Date.parse(e.end_at) - Date.parse(e.start_at)) / 60_000));
}

export function statsPeriode(events: CalendarEvent[], missions: PlanningMission[] = []): PlanningStats {
  const productives = events.filter((e) => e.kind === "productive" && e.statut !== "annulee");
  const planifiees = productives.filter((e) => e.statut !== "terminee").length + missions.filter((m) => m.statut === "a_faire").length;
  const terminees = productives.filter((e) => e.statut === "terminee").length + missions.filter((m) => m.statut === "terminee").length;
  const reportees = events.filter((e) => e.kind === "productive" && e.statut === "reportee").length;
  const annulees = events.filter((e) => e.kind === "productive" && e.statut === "annulee").length;
  const prises = planifiees + terminees;
  const xpPotentielle =
    productives.reduce((s, e) => s + (e.xp_prevu || 0), 0) + missions.filter((m) => m.statut !== "annulee").reduce((s, m) => s + (m.xp_prevu || 0), 0);
  const xpGagnee =
    productives.reduce((s, e) => s + (e.statut === "terminee" ? e.xp_gagne ?? 0 : 0), 0) +
    missions.reduce((s, m) => s + (m.statut === "terminee" ? m.xp_gagne || 0 : 0), 0);
  const minutesPlanifiees = productives.reduce((s, e) => s + minutesEvent(e), 0) + missions.reduce((s, m) => s + (m.duree_min || 0), 0);
  const minutesTerminees =
    productives.filter((e) => e.statut === "terminee").reduce((s, e) => s + minutesEvent(e), 0) +
    missions.filter((m) => m.statut === "terminee").reduce((s, m) => s + (m.duree_min || 0), 0);
  const minutesOccupees = events.filter((e) => e.statut !== "annulee").reduce((s, e) => s + minutesEvent(e), 0);
  return {
    planifiees: planifiees + terminees,
    terminees,
    reportees,
    annulees,
    xpPotentielle,
    xpGagnee,
    taux: prises === 0 ? null : Math.round((terminees / prises) * 1000) / 10,
    minutesPlanifiees,
    minutesTerminees,
    minutesOccupees,
  };
}
