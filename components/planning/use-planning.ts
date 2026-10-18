"use client";

import type { CalendarEvent, PlanningChevauchement, PlanningMission, TerminerPlanningResult } from "@/lib/planning/types";
import { useCallback, useEffect, useState } from "react";

export function usePlanning(from: string, to: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [missions, setMissions] = useState<PlanningMission[]>([]);
  const [overlaps, setOverlaps] = useState<PlanningChevauchement[]>([]);
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [aujourdHui, setAujourdHui] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!from || !to) return;
    setError(null);
    const res = await fetch(`/api/planning?from=${from}&to=${to}`);
    if (!res.ok) {
      setLoading(false);
      setError("Impossible de charger le planning.");
      return;
    }
    const json = (await res.json()) as {
      events: CalendarEvent[];
      missions: PlanningMission[];
      overlaps: PlanningChevauchement[];
      timezone: string;
      aujourdHui: string;
    };
    setEvents(json.events ?? []);
    setMissions(json.missions ?? []);
    setOverlaps(json.overlaps ?? []);
    setTimezone(json.timezone);
    setAujourdHui(json.aujourdHui);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const upsert = useCallback((event: CalendarEvent, nextOverlaps?: PlanningChevauchement[]) => {
    setEvents((prev) => {
      const i = prev.findIndex((e) => e.id === event.id);
      if (i < 0) return [...prev, event];
      const copy = prev.slice();
      copy[i] = event;
      return copy;
    });
    if (nextOverlaps) setOverlaps(nextOverlaps);
  }, []);

  const retirer = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, missions, overlaps, timezone, aujourdHui, loading, error, reload, upsert, retirer };
}

export async function apiCreer(body: Record<string, unknown>) {
  const res = await fetch("/api/planning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Création impossible.");
  return json as { event: CalendarEvent; overlaps: PlanningChevauchement[] };
}

export async function apiModifier(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/planning/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Modification impossible.");
  return json as { event: CalendarEvent; overlaps: PlanningChevauchement[] };
}

export async function apiAction(id: string, action: "terminer" | "reporter" | "annuler" | "demarrer", extra?: Record<string, unknown>) {
  const res = await fetch(`/api/planning/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extra ?? {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Action impossible.");
  return json as { event?: CalendarEvent } & TerminerPlanningResult;
}
