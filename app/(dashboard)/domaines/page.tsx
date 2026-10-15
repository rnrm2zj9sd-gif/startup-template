"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DOMAINE_AFFICHE, DOMAINE_LABELS } from "@/lib/progression/config";
import { progressionVersNiveauSuivant, rangDepuisNiveau } from "@/lib/progression/niveau";
import { useProgression } from "@/lib/progression/use-progression";
import { formatXP } from "@/lib/system";

export default function DomainesPage() {
  const { data, loading } = useProgression();

  return (
    <>
      <DashboardHeader title="Domaines" description="Tes six domaines, alimentés par le registre d'XP." />

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {DOMAINE_AFFICHE.map((d) => {
            const xp = data.xpParDomaine[d] ?? 0;
            const { niveau, xpDansNiveau, xpPourSuivant } = progressionVersNiveauSuivant(xp);
            const vide = xp <= 0;
            const rang = rangDepuisNiveau(niveau);
            const fill = xpPourSuivant > 0 ? Math.min(100, (xpDansNiveau / xpPourSuivant) * 100) : 0;
            return (
              <li key={d} className="rounded-2xl border border-border bg-card p-5" data-domaine={d}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-medium tracking-[0.16em]">{DOMAINE_LABELS[d].toUpperCase()}</h2>
                  <span className="font-mono text-xs text-brand-gold">RANG {rang}</span>
                </div>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-[10px] tracking-[0.28em] text-muted-foreground">NIV.</span>
                  <span className="font-mono text-3xl font-light tabular-nums">{String(niveau).padStart(2, "0")}</span>
                </p>
                <div
                  role="progressbar"
                  aria-label={`XP ${DOMAINE_LABELS[d]} vers le niveau suivant`}
                  aria-valuemin={0}
                  aria-valuemax={xpPourSuivant}
                  aria-valuenow={xpDansNiveau}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
                </div>
                <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatXP(xpDansNiveau)} / {formatXP(xpPourSuivant)} XP · total {formatXP(xp)}
                </p>
                {vide && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Pas encore d&apos;XP ici. Valide une première mission dans ce domaine.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
