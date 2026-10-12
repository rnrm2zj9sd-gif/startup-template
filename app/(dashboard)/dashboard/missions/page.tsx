"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SessionCard } from "@/components/dashboard/session-card";
import { fenetreSemaine } from "@/lib/progression/generer";
import type { MissionRow } from "@/lib/progression/types";
import { useMissionsJour } from "@/lib/progression/use-missions";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function MissionsPage() {
  const { missions, date, loading } = useMissionsJour();
  const [semaine, setSemaine] = useState<MissionRow[]>([]);

  useEffect(() => {
    if (!date) return;
    const { debut, fin } = fenetreSemaine(date);
    void fetch(`/api/missions?from=${debut}&to=${fin}`)
      .then((r) => (r.ok ? r.json() : { missions: [] }))
      .then((json: { missions?: MissionRow[] }) => setSemaine(json.missions ?? []));
  }, [date, missions]);

  const parJour = useMemo(() => {
    if (!date) return [];
    const { debut } = fenetreSemaine(date);
    return JOURS.map((jour, i) => {
      const d = addDays(debut, i);
      const duJour = semaine.filter((m) => m.date_locale === d);
      return { date: d, jour, missions: duJour, minutes: duJour.reduce((a, m) => a + m.duree_min, 0) };
    });
  }, [date, semaine]);

  const minutes = missions.reduce((a, m) => a + m.duree_min, 0);

  return (
    <>
      <DashboardHeader
        title="Missions"
        description={loading ? "Tes séances de la semaine." : `${minutes} min prévues aujourd'hui`}
      />

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-[11px] tracking-[0.3em] text-muted-foreground">AUJOURD&apos;HUI</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !missions.length ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Rien de prévu aujourd&apos;hui. Repos, ou ajuste tes compétences dans Paramètres.
            </p>
          ) : (
            <div className="grid gap-4">
              {missions.map((mission) => (
                <SessionCard key={mission.id} mission={mission} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[11px] tracking-[0.3em] text-muted-foreground">CETTE SEMAINE</h2>
          <ol className="grid gap-3">
            {parJour.map((j) => {
              const isToday = j.date === date;
              return (
                <li
                  key={j.date}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-5",
                    isToday && "border-brand-purple/40 bg-panel",
                  )}
                >
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {j.jour}
                      {isToday ? " · aujourd'hui" : ""}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{j.minutes} min</span>
                  </p>
                  {j.missions.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">Repos</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {j.missions.map((s) => (
                        <li key={s.id} className="text-sm text-muted-foreground">
                          <span className="text-foreground">{s.titre}</span>
                          <span className="ml-2 font-mono text-xs tabular-nums">
                            {s.duree_min} min · +{s.xp_prevu} XP
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}

function addDays(dateISO: string, n: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
