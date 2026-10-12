"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SessionCard } from "@/components/dashboard/session-card";
import { useMoteurPlan } from "@/lib/moteur-store";
import { cn } from "@/lib/utils";

export default function MissionsPage() {
  const { semaine, jour, today, hydrated } = useMoteurPlan();
  const minutes = jour?.minutesTotal ?? 0;

  return (
    <>
      <DashboardHeader
        title="Missions"
        description={
          hydrated
            ? jour
              ? `${jour.jour} · ${minutes} min prévues`
              : "Tes séances de la semaine."
            : "Tes séances de la semaine."
        }
      />

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-[11px] tracking-[0.3em] text-muted-foreground">AUJOURD&apos;HUI</h2>
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !jour?.seances.length ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Rien de prévu aujourd&apos;hui. Repos, ou ajuste tes compétences dans Paramètres.
            </p>
          ) : (
            <div className="grid gap-4">
              {jour.seances.map((seance) => (
                <SessionCard key={`${seance.date}-${seance.competenceId}`} seance={seance} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[11px] tracking-[0.3em] text-muted-foreground">CETTE SEMAINE</h2>
          <ol className="grid gap-3">
            {semaine.map((j) => {
              const isToday = j.date === today;
              return (
                <li
                  key={j.date}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-5",
                    isToday && "border-brand-purple/40 bg-panel"
                  )}
                >
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {j.jour}
                      {isToday ? " · aujourd'hui" : ""}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {j.minutesTotal} min
                    </span>
                  </p>
                  {j.seances.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">Repos</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {j.seances.map((s) => (
                        <li key={s.competenceId} className="text-sm text-muted-foreground">
                          <span className="text-foreground">{s.competence}</span>
                          {" · "}
                          {s.focusNoms.join(" + ")}
                          <span className="ml-2 font-mono text-xs tabular-nums">
                            {s.minutesTotal} min · +{s.xpEstime} XP
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
