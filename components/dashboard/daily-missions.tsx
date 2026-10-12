"use client";

import { useMissionsJour } from "@/lib/progression/use-missions";
import { useProgression } from "@/lib/progression/use-progression";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function DailyMissions({ className }: { className?: string }) {
  const { missions, loading, valider } = useMissionsJour();
  const { reload } = useProgression();
  const doneCount = missions.filter((m) => m.statut === "terminee").length;
  const total = missions.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section
      aria-labelledby="missions-title"
      className={cn("flex flex-col rounded-2xl border border-border bg-card", className)}
    >
      <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 id="missions-title" className="text-[11px] tracking-[0.3em] text-muted-foreground">
            MISSIONS DU JOUR
          </h2>
          <Link href="/dashboard/missions" className="text-xs text-muted-foreground hover:text-foreground">
            Voir la semaine
          </Link>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground/80">
                {doneCount} / {total}
              </span>{" "}
              terminées
            </p>
            <div
              role="progressbar"
              aria-label={`${doneCount} missions sur ${total}`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={doneCount}
              className="h-1 w-24 overflow-hidden rounded-full bg-white/5"
            >
              <div className="h-full rounded-full bg-brand-purple" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{progress}%</span>
          </div>
        )}
      </header>

      {loading ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Chargement des missions…</p>
      ) : total === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Jour de repos. Ou choisis tes compétences dans{" "}
          <Link href="/dashboard/parametres" className="text-foreground underline-offset-2 hover:underline">
            Paramètres
          </Link>
          .
        </p>
      ) : (
        <ul>
          {missions.map((mission) => {
            const done = mission.statut === "terminee";
            return (
              <li key={mission.id} className="border-b border-border last:border-b-0">
                <label className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={done}
                    onChange={() => {
                      if (done) return;
                      void valider(mission.id, "bien")
                        .then((r) => {
                          void reload();
                          if (r.plafondMessage) toast.message(r.plafondMessage);
                          else toast.success(`+${r.xp} XP`);
                        })
                        .catch((err: unknown) => {
                          toast.error(err instanceof Error ? err.message : "Validation impossible");
                        });
                    }}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-purple/60",
                      done
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-border bg-transparent",
                    )}
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                  </span>

                  <span className={cn("min-w-0 flex-1 truncate text-sm", done ? "text-muted-foreground" : "text-foreground")}>
                    {mission.titre}
                  </span>

                  <span className="hidden w-20 shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:block">
                    {mission.duree_min} min
                  </span>

                  <span
                    className={cn(
                      "w-16 shrink-0 text-right font-mono text-sm tabular-nums",
                      done ? "text-muted-foreground" : "text-brand-gold",
                    )}
                  >
                    +{mission.xp_prevu} XP
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
