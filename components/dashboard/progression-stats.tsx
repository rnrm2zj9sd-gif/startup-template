"use client";

import {
  CLASSE_MISSIONS_MIN,
  DISCIPLINE_JOURS,
  OBJECTIF_MISSIONS_MIN,
  POWER_PAR_NIVEAU_DOMAINE,
  POWER_PAR_OBJECTIF_VALIDE,
} from "@/lib/progression/config";
import type { ProgressionSnapshot } from "@/lib/progression/types";
import { formatXP } from "@/lib/system";

export function ProgressionStats({ snap }: { snap: ProgressionSnapshot }) {
  const d = snap.disciplineDetail;
  const p = snap.powerDetail;
  const maxXp = Math.max(1, ...snap.xpParJour.map((j) => j.xp));

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-block="power">
        <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">POWER</h2>
        <p className="mt-2 font-mono text-4xl font-light tabular-nums" data-power={snap.power}>
          {snap.power}
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Somme des niveaux de domaine : {p.sommeNiveaux} × {POWER_PAR_NIVEAU_DOMAINE} ={" "}
            <span className="font-mono tabular-nums text-foreground">{p.sommeNiveaux * POWER_PAR_NIVEAU_DOMAINE}</span>
          </li>
          <li>
            Objectifs valides (≥ {OBJECTIF_MISSIONS_MIN} missions) : {p.objectifsValides} × {POWER_PAR_OBJECTIF_VALIDE} ={" "}
            <span className="font-mono tabular-nums text-foreground">{p.objectifsValides * POWER_PAR_OBJECTIF_VALIDE}</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-block="classe">
        <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">CLASSE</h2>
        <p className="mt-2 text-2xl font-semibold tracking-[0.18em] text-primary">{snap.classe}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu restes Initié tant que tu n&apos;as pas validé {CLASSE_MISSIONS_MIN} missions.
        </p>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {snap.missionsValidees} / {CLASSE_MISSIONS_MIN} missions validées
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-block="discipline">
        <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">
          INDICE DE DISCIPLINE · {DISCIPLINE_JOURS} J
        </h2>
        <p className="mt-2 font-mono text-4xl font-light tabular-nums">
          {snap.discipline}
          <span className="ml-1 text-base text-muted-foreground">/ 100</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <Partie label="Engagements tenus" poids={60} valeur={d.partTenues} detail={`${d.tenues} / ${d.prevues}`} />
          <Partie label="Jours actifs" poids={25} valeur={d.partActifs} detail={`${d.joursActifs} / ${DISCIPLINE_JOURS}`} />
          <Partie label="Reports honorés" poids={15} valeur={d.partReports} detail={`${d.reporteesFaites} / ${d.reportees}`} />
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-block="xp-30j">
        <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">XP · 30 DERNIERS JOURS</h2>
        <div className="mt-4 flex h-28 items-end gap-px sm:gap-0.5" role="img" aria-label="XP des 30 derniers jours">
          {snap.xpParJour.map((j) => {
            const h = j.xp > 0 ? Math.max(8, Math.round((j.xp / maxXp) * 100)) : 2;
            return (
              <div key={j.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <div
                  title={`${j.date} · ${formatXP(j.xp)} XP`}
                  className="w-full max-w-[10px] rounded-t-sm bg-primary"
                  style={{ height: `${h}%`, opacity: j.xp > 0 ? 1 : 0.25 }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>{labelJour(snap.xpParJour[0]?.date)}</span>
          <span>{labelJour(snap.xpParJour.at(-1)?.date)}</span>
        </div>
      </section>
    </>
  );
}

function Partie({
  label,
  poids,
  valeur,
  detail,
}: {
  label: string;
  poids: number;
  valeur: number;
  detail: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">
          {poids} % {label.toLowerCase()}
        </span>
        <span className="font-mono text-xs tabular-nums">
          {valeur}
          <span className="text-muted-foreground"> · {detail}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (valeur / poids) * 100)}%` }} />
      </div>
    </li>
  );
}

function labelJour(iso?: string) {
  if (!iso || iso.length < 10) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
