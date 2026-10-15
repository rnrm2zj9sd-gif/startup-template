"use client";

import { Button } from "@/components/ui/button";
import { RESSENTI_LABELS } from "@/lib/moteur/app";
import type { Ressenti } from "@/lib/moteur";
import type { JournalLigne, MissionRow, ProgressionSnapshot } from "@/lib/progression/types";
import { useMissionsJour } from "@/lib/progression/use-missions";
import { useProgression } from "@/lib/progression/use-progression";
import { useProfile } from "@/lib/profile-store";
import { formatXP, getXPProgress } from "@/lib/system";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const RESSENTIS: Ressenti[] = ["trop_facile", "bien", "trop_dur", "pas_fait"];

/** Daily System : progression en haut, missions du jour, System Log en bas. */
export function DailySystem() {
  const { data: snap, loading: snapLoading, reload: reloadSnap } = useProgression();
  const { missions, loading, valider, reporter } = useMissionsJour();
  const { reloadProgression } = useProfile();
  const [journal, setJournal] = useState<JournalLigne[] | null>(null);

  const reloadJournal = useCallback(async () => {
    const res = await fetch("/api/me/journal");
    if (res.ok) setJournal(((await res.json()) as { lignes: JournalLigne[] }).lignes);
  }, []);

  useEffect(() => {
    void reloadJournal();
  }, [reloadJournal]);

  async function onValider(mission: MissionRow, ressenti: Ressenti) {
    try {
      const r = await valider(mission.id, ressenti);
      if (r.plafondMessage) toast.message(r.plafondMessage);
      else toast.success(r.xp > 0 ? `+${r.xp} XP` : "Mission enregistrée.");
      await Promise.all([reloadSnap(), reloadJournal(), reloadProgression()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation impossible.");
    }
  }

  async function onReporter(mission: MissionRow) {
    try {
      await reporter(mission.id);
      toast.message("Mission reportée à demain.");
      await reloadSnap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report impossible.");
    }
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <Statistiques snap={snap} loading={snapLoading} />

      <section aria-labelledby="missions-title" className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="missions-title" className="text-[11px] tracking-[0.3em] text-muted-foreground">
            MISSIONS DU JOUR
          </h2>
          {missions.length > 0 && (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {missions.filter((m) => m.statut === "terminee").length} / {missions.length}
            </p>
          )}
        </header>
        {loading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Chargement des missions…</p>
        ) : missions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Aucune mission aujourd&apos;hui. Ajuste tes compétences dans{" "}
            <Link href="/dashboard/parametres" className="text-foreground underline-offset-2 hover:underline">
              Paramètres
            </Link>
            .
          </p>
        ) : (
          <ul>
            {missions.map((m) => (
              <MissionItem key={m.id} mission={m} onValider={onValider} onReporter={onReporter} />
            ))}
          </ul>
        )}
      </section>

      <Journal lignes={journal} />
    </div>
  );
}

function Statistiques({ snap, loading }: { snap: ProgressionSnapshot | null; loading: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const progress = snap ? getXPProgress(snap.xpDansNiveau, snap.xpPourSuivant) : 0;
  const reste = snap ? Math.max(0, snap.xpPourSuivant - snap.xpDansNiveau) : 0;

  return (
    <section aria-label="Progression" className="rounded-2xl border border-border bg-panel p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="text-[10px] tracking-[0.28em] text-muted-foreground">NIV.</span>
          <span className="font-mono text-4xl font-light leading-none tabular-nums">
            {snap ? String(snap.niveau).padStart(2, "0") : "—"}
          </span>
        </p>
        <p className="text-right">
          <span className="block text-[10px] tracking-[0.28em] text-muted-foreground">RANG</span>
          <span className="font-mono text-2xl text-brand-gold">{snap?.rang ?? "—"}</span>
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="XP vers le prochain niveau"
        aria-valuemin={0}
        aria-valuemax={snap?.xpPourSuivant ?? 0}
        aria-valuenow={snap?.xpDansNiveau ?? 0}
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
      <p className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>
          {snap ? `${formatXP(snap.xpDansNiveau)} / ${formatXP(snap.xpPourSuivant)} XP` : loading ? "Chargement…" : "—"}
        </span>
        <span>{snap ? `${formatXP(reste)} XP avant niv. ${snap.niveau + 1}` : ""}</span>
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <dt className="text-[10px] tracking-[0.28em] text-muted-foreground">CHAÎNE</dt>
          <dd className="mt-1 font-mono text-xl tabular-nums">
            {snap?.chaineJours ?? "—"} <span className="text-xs text-muted-foreground">{snap?.chaineJours === 1 ? "jour" : "jours"}</span>
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <dt className="text-[10px] tracking-[0.28em] text-muted-foreground">DISCIPLINE</dt>
          <dd className="mt-1 font-mono text-xl tabular-nums">
            {snap?.discipline ?? "—"} <span className="text-xs text-muted-foreground">/ 100</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function MissionItem({
  mission,
  onValider,
  onReporter,
}: {
  mission: MissionRow;
  onValider: (m: MissionRow, r: Ressenti) => Promise<void>;
  onReporter: (m: MissionRow) => Promise<void>;
}) {
  const [ressenti, setRessenti] = useState<Ressenti>("bien");
  const [envoi, setEnvoi] = useState(false);
  const done = mission.statut === "terminee";
  const reportee = Boolean(mission.payload?.reportee);

  async function run(action: () => Promise<void>) {
    setEnvoi(true);
    await action();
    setEnvoi(false);
  }

  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0" data-mission-id={mission.id}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            done ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {done && <Check className="size-3" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{mission.titre}</p>
          {mission.description && <p className="mt-1 text-xs text-muted-foreground">{mission.description}</p>}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
            <span>{mission.duree_min} min</span>
            <span className={done ? "" : "text-brand-gold"}>≈ +{mission.xp_prevu} XP</span>
            {mission.type === "first" && <span className="tracking-[0.2em] text-primary">PREMIÈRE VICTOIRE</span>}
            {reportee && <span className="tracking-[0.2em]">REPORTÉE</span>}
          </p>
        </div>
      </div>

      {!done && (
        <div className="mt-4 flex flex-col gap-3 pl-8">
          <div role="radiogroup" aria-label="Ressenti" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {RESSENTIS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={ressenti === r}
                onClick={() => setRessenti(r)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs transition-colors",
                  ressenti === r ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-white/15",
                )}
              >
                {RESSENTI_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={envoi} onClick={() => run(() => onValider(mission, ressenti))} className="h-10 flex-1 sm:flex-none">
              Valider
            </Button>
            {mission.type === "daily" && (
              <Button
                type="button"
                variant="outline"
                disabled={envoi}
                onClick={() => run(() => onReporter(mission))}
                className="h-10 flex-1 sm:flex-none"
              >
                Reporter à demain
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function texteJournal(l: JournalLigne): string {
  const p = l.payload ?? {};
  switch (l.type) {
    case "mission_validee":
      return `Mission validée · ressenti ${RESSENTI_LABELS[p.ressenti as Ressenti]?.toLowerCase() ?? "—"}`;
    case "xp_gagnee":
      return `+${p.xp} XP${p.plafond ? " (plafond atteint)" : ""}`;
    case "niveau_gagne":
      return `Niveau ${p.de} → ${p.vers}`;
    case "rang_obtenu":
      return `Rang ${p.vers} obtenu`;
    default:
      return l.type;
  }
}

function Journal({ lignes }: { lignes: JournalLigne[] | null }) {
  return (
    <section aria-labelledby="journal-title" className="rounded-2xl border border-border bg-card">
      <h2 id="journal-title" className="border-b border-border px-5 py-4 text-[11px] tracking-[0.3em] text-muted-foreground">
        SYSTEM LOG
      </h2>
      {lignes === null ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Rien pour l&apos;instant. Valide une mission.</p>
      ) : (
        <ol className="divide-y divide-border">
          {lignes.map((l) => (
            <li key={l.id} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm" data-log-type={l.type}>
              <span className={l.type === "xp_gagnee" ? "text-brand-gold" : ""}>{texteJournal(l)}</span>
              <time dateTime={l.created_at} className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {new Date(l.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
