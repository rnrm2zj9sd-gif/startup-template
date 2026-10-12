"use client";

import { semaineSerie } from "@/lib/moteur/app";
import { useMoteurPlan } from "@/lib/moteur-store";
import { cn } from "@/lib/utils";
import { Activity, Check } from "lucide-react";

export function StreakCard({ className }: { className?: string }) {
  const { etat, meilleureChaine, semaine, today, hydrated } = useMoteurPlan();
  const days = hydrated ? etat.chaineJours : 0;
  const best = hydrated ? Math.max(meilleureChaine, etat.chaineJours) : 0;
  const week = hydrated ? semaineSerie(semaine, etat, today) : [];

  return (
    <section
      aria-labelledby="streak-title"
      className={cn("flex flex-col rounded-2xl border border-border bg-card p-5", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="streak-title" className="text-[11px] tracking-[0.3em] text-muted-foreground">
          SÉRIE ACTUELLE
        </h2>
        <Activity className="size-4 text-brand-purple" aria-hidden />
      </div>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-5xl font-light leading-none tabular-nums">{days}</span>
        <span className="text-sm tracking-[0.12em] text-muted-foreground">
          {days > 1 ? "JOURS" : "JOUR"}
        </span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Meilleur record : <span className="font-mono tabular-nums text-foreground/80">{best}</span>{" "}
        {best > 1 ? "jours" : "jour"}
      </p>

      <ol className="mt-6 grid grid-cols-7 gap-1" aria-label="Semaine en cours">
        {week.map((day, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              aria-label={
                day.status === "done"
                  ? "validé"
                  : day.status === "today"
                    ? "aujourd'hui"
                    : day.status === "missed"
                      ? "manqué"
                      : "à venir"
              }
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs",
                day.status === "done" && "border-brand-purple/40 bg-brand-purple/20 text-brand-purple",
                day.status === "today" &&
                  "border-brand-purple bg-transparent text-foreground ring-2 ring-brand-purple/25",
                day.status === "upcoming" && "border-border text-muted-foreground",
                day.status === "missed" && "border-border text-muted-foreground/60"
              )}
            >
              {day.status === "done" ? (
                <Check className="size-3" strokeWidth={2.5} aria-hidden />
              ) : (
                <span className="size-1.5 rounded-full bg-current opacity-60" aria-hidden />
              )}
            </span>
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
