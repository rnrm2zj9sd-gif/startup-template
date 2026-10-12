"use client";

import { labelAttribut, RESSENTI_LABELS, ressentiSeance, seanceEnregistree } from "@/lib/moteur/app";
import { useMoteur } from "@/lib/moteur-store";
import type { Ressenti, SeancePrevue } from "@/lib/moteur";
import { cn } from "@/lib/utils";

const RESSENTIS: Ressenti[] = ["trop_facile", "bien", "trop_dur", "pas_fait"];

export function SessionCard({
  seance,
  compact = false,
}: {
  seance: SeancePrevue;
  compact?: boolean;
}) {
  const { etat, terminerSeance } = useMoteur();
  const ressenti = ressentiSeance(etat, seance);
  const locked = seanceEnregistree(etat, seance);

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground">{labelAttribut(seance.competenceId).toUpperCase()}</p>
          <h3 className="mt-1 text-base font-medium">
            {seance.competence}
            <span className="text-muted-foreground"> · {seance.focusNoms.join(" + ")}</span>
          </h3>
        </div>
        <p className="shrink-0 font-mono text-sm tabular-nums text-brand-gold">
          {seance.minutesTotal} min · +{seance.xpEstime} XP
        </p>
      </header>

      {!compact && seance.echauffement && (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground/80">Échauffement — </span>
          {seance.echauffement}
        </p>
      )}

      <ul className="mt-4 space-y-2.5">
        {seance.exercices.map((ex) => (
          <li key={ex.exerciceId}>
            <p className="text-sm">
              {ex.nom} <span className="text-muted-foreground">[{ex.focus}]</span>
            </p>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">{ex.prescription}</p>
            {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{ex.consigne}</p>}
            {ex.ressource && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                📺 Idées : {ex.ressource.suggestions.join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!compact && (
        <p className="mt-4 text-xs text-muted-foreground">
          Jour difficile : <span className="text-foreground/80">{seance.missionPlancher}</span>
        </p>
      )}

      <div className="mt-4">
        {locked && ressenti ? (
          <p className="text-xs tracking-[0.18em] text-muted-foreground">
            RESSENTI · {RESSENTI_LABELS[ressenti].toUpperCase()}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Comment s'est passée la séance">
            {RESSENTIS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => terminerSeance(seance, r)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-white/15 hover:text-foreground",
                  r === "bien" && "hover:border-brand-purple/50 hover:text-foreground"
                )}
              >
                {RESSENTI_LABELS[r]}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
