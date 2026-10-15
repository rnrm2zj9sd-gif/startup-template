"use client";

import { useCallback, useEffect, useState } from "react";
import type { MissionRow, ValidateMissionResult } from "./types";

export function useMissionsJour() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const gen = await fetch("/api/missions/generer", { method: "POST" });
    if (!gen.ok) {
      setLoading(false);
      setError("Impossible de charger les missions.");
      return [];
    }
    const json = (await gen.json()) as { date: string; missions: MissionRow[] };
    setDate(json.date);
    setMissions(json.missions ?? []);
    setLoading(false);
    return json.missions ?? [];
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const valider = useCallback(
    async (missionId: string, ressenti = "bien") => {
      const res = await fetch(`/api/missions/${missionId}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, ressenti }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Validation impossible");
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, statut: "terminee" } : m)),
      );
      return json as ValidateMissionResult;
    },
    [],
  );

  const reporter = useCallback(async (missionId: string) => {
    const res = await fetch(`/api/missions/${missionId}/reporter`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Report impossible");
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    return json.mission as MissionRow;
  }, []);

  return { missions, date, loading, error, reload, valider, reporter };
}
