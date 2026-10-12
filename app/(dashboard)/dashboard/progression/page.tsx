"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CATALOGUE, PALIERS_PAR_NIVEAU } from "@/lib/moteur";
import { useMoteur } from "@/lib/moteur-store";

export default function ProgressionPage() {
  const { etat, hydrated } = useMoteur();
  const lignes = Object.entries(etat.progression).sort((a, b) => {
    if (b[1].niveau !== a[1].niveau) return b[1].niveau - a[1].niveau;
    return b[1].palier - a[1].palier;
  });

  return (
    <>
      <DashboardHeader title="Progression" description="Tes zones, niveaux et paliers." />

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">ZONES</h2>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Chaîne {etat.chaineJours} j
          </p>
        </div>

        {!hydrated ? (
          <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Termine ta première séance : les niveaux apparaissent ici.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {lignes.map(([cle, prog]) => {
              const [competenceId, focusId] = cle.split(":");
              const competence = CATALOGUE[competenceId];
              const focus = competence?.focus.find((f) => f.id === focusId);
              const fill = (prog.palier / PALIERS_PAR_NIVEAU) * 100;
              return (
                <li key={cle}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">
                      {competence?.nom ?? competenceId}
                      <span className="text-muted-foreground"> · {focus?.nom ?? focusId}</span>
                    </p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      niv. {prog.niveau} · {prog.palier}/{PALIERS_PAR_NIVEAU}
                    </p>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Palier ${prog.palier} sur ${PALIERS_PAR_NIVEAU}`}
                    aria-valuemin={0}
                    aria-valuemax={PALIERS_PAR_NIVEAU}
                    aria-valuenow={prog.palier}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"
                  >
                    <div className="h-full rounded-full bg-brand-purple" style={{ width: `${fill}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
