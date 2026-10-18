"use client";

import { RESSENTI_LABELS } from "@/lib/moteur/app";
import type { Ressenti, SeancePrevue } from "@/lib/moteur";
import type { MissionRow } from "@/lib/progression/types";
import { useMissionsJour } from "@/lib/progression/use-missions";
import { useProgression } from "@/lib/progression/use-progression";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RESSENTIS: Ressenti[] = ["trop_facile", "bien", "trop_dur", "pas_fait"];

export function SessionCard({
  mission,
  compact = false,
}: {
  mission: MissionRow;
  compact?: boolean;
}) {
  const { valider } = useMissionsJour();
  const { reload } = useProgression();
  const seance = mission.payload?.seance as SeancePrevue | undefined;
  const locked = mission.statut !== "a_faire";

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground">{mission.domaine.toUpperCase()}</p>
          <h3 className="mt-1 text-base font-medium">{mission.titre}</h3>
        </div>
        <p className="shrink-0 font-mono text-sm tabular-nums text-brand-gold">
          {mission.duree_min} min · +{mission.xp_prevu} XP
        </p>
      </header>

      {!compact && seance?.echauffement && (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground/80">Échauffement — </span>
          {seance.echauffement}
        </p>
      )}

      {seance && (
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
      )}

      {!compact && mission.description && (
        <p className="mt-4 text-xs text-muted-foreground">
          Jour difficile : <span className="text-foreground/80">{mission.description}</span>
        </p>
      )}

      <div className="mt-4">
        {locked ? (
          <p className="text-xs tracking-[0.18em] text-muted-foreground">MISSION TERMINÉE</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Comment s'est passée la séance">
            {RESSENTIS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  void valider(mission.id, r)
                    .then((res) => {
                      void reload();
                      if (res.deja) toast.message("Déjà validée.");
                      else if (res.plafondMessage) toast.message(res.plafondMessage);
                      else toast.success(`+${res.xp} XP`);
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "Validation impossible");
                    });
                }}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-white/15 hover:text-foreground",
                  r === "bien" && "hover:border-brand-purple/50 hover:text-foreground",
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
