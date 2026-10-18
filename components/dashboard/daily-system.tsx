"use client";

import { Button } from "@/components/ui/button";
import { RESSENTI_LABELS } from "@/lib/moteur/app";
import type { Ressenti } from "@/lib/moteur";
import { DOMAINE_AFFICHE, DOMAINE_LABELS, type DomaineAffiche } from "@/lib/progression/config";
import { texteJournal } from "@/lib/progression/journal";
import type { JournalLigne, MissionRow } from "@/lib/progression/types";
import { useMissionsJour } from "@/lib/progression/use-missions";
import { useProgression } from "@/lib/progression/use-progression";
import { useProfile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import { SystemPanel } from "@/components/dashboard/system-panel";
import { Brain, Check, Dumbbell, Heart, Home, ListChecks, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const RESSENTIS: Ressenti[] = ["trop_facile", "bien", "trop_dur", "pas_fait"];

const ICONE_DOMAINE = {
  finance: Wallet,
  mind: Brain,
  health: Heart,
  fitness: Dumbbell,
  discipline: ListChecks,
  life: Home,
} as const;

/** Daily System : progression en haut, missions du jour, System Log en bas. */
export function DailySystem() {
  const { reload: reloadSnap } = useProgression();
  const { missions, loading, valider, reporter } = useMissionsJour();
  const { reloadProgression } = useProfile();
  const [journal, setJournal] = useState<JournalLigne[] | null>(null);

  const reloadJournal = useCallback(async () => {
    const res = await fetch("/api/me/journal?limit=10");
    if (res.ok) setJournal(((await res.json()) as { lignes: JournalLigne[] }).lignes);
  }, []);

  useEffect(() => {
    void reloadJournal();
  }, [reloadJournal]);

  async function onValider(mission: MissionRow, ressenti: Ressenti) {
    try {
      const r = await valider(mission.id, ressenti);
      if (r.deja) toast.message("Déjà validée.");
      else if (r.plafondMessage) toast.message(r.plafondMessage);
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
    <div data-testid="daily-system" className="flex flex-col gap-5 md:gap-6">
      <SystemPanel />

      <section aria-labelledby="missions-title" className="flex flex-col gap-4">
        <MissionsEntete missions={missions} loading={loading} />
        {loading ? (
          <p className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
            Chargement des missions…
          </p>
        ) : missions.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card px-5 py-8 text-sm leading-relaxed text-muted-foreground">
            Rien de prévu aujourd&apos;hui. Repos, ou ajuste tes compétences dans{" "}
            <Link href="/competences" className="text-foreground underline-offset-2 hover:underline">
              Compétences
            </Link>
            .
          </p>
        ) : (
          <MissionsParDomaine missions={missions} onValider={onValider} onReporter={onReporter} />
        )}
      </section>

      <Journal lignes={journal} />
    </div>
  );
}

function MissionsEntete({ missions, loading }: { missions: MissionRow[]; loading: boolean }) {
  const faites = missions.filter((m) => m.statut === "terminee").length;
  const total = missions.length;
  const ratio = total > 0 ? Math.round((faites / total) * 100) : 0;

  return (
    <header className="flex items-end justify-between gap-4 px-1">
      <div>
        <h2 id="missions-title" className="text-[11px] tracking-[0.3em] text-muted-foreground">
          AUJOURD&apos;HUI
        </h2>
        <p className="mt-1 text-sm text-foreground">
          {loading ? "Chargement…" : total === 0 ? "Journée libre" : `${faites} sur ${total}`}
        </p>
      </div>
      {total > 0 && (
        <div className="w-28">
          <div
            role="progressbar"
            aria-label="Missions faites aujourd'hui"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={faites}
            className="h-1.5 overflow-hidden rounded-full bg-white/5"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${ratio}%` }} />
          </div>
        </div>
      )}
    </header>
  );
}

function MissionsParDomaine({
  missions,
  onValider,
  onReporter,
}: {
  missions: MissionRow[];
  onValider: (m: MissionRow, r: Ressenti) => Promise<void>;
  onReporter: (m: MissionRow) => Promise<void>;
}) {
  const premiere = missions.filter((m) => m.type === "first");
  const reste = missions.filter((m) => m.type !== "first");
  const groupes = DOMAINE_AFFICHE.map((domaine) => ({
    domaine,
    missions: reste.filter((m) => m.domaine === domaine),
  })).filter((g) => g.missions.length > 0);
  const ailleurs = reste.filter((m) => !DOMAINE_AFFICHE.includes(m.domaine as DomaineAffiche));

  return (
    <div className="flex flex-col gap-6">
      {premiere.length > 0 && (
        <ul className="flex flex-col gap-3">
          {premiere.map((m) => (
            <MissionItem key={m.id} mission={m} onValider={onValider} onReporter={onReporter} />
          ))}
        </ul>
      )}
      {groupes.map((g) => {
        const Icone = ICONE_DOMAINE[g.domaine];
        return (
          <section key={g.domaine} aria-label={DOMAINE_LABELS[g.domaine]} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 px-1 text-[11px] tracking-[0.28em] text-muted-foreground">
              <Icone className="size-3.5" aria-hidden />
              {DOMAINE_LABELS[g.domaine].toUpperCase()}
            </h3>
            <ul className="flex flex-col gap-3">
              {g.missions.map((m) => (
                <MissionItem key={m.id} mission={m} onValider={onValider} onReporter={onReporter} />
              ))}
            </ul>
          </section>
        );
      })}
      {ailleurs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {ailleurs.map((m) => (
            <MissionItem key={m.id} mission={m} onValider={onValider} onReporter={onReporter} />
          ))}
        </ul>
      )}
    </div>
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
    <li data-mission-id={mission.id}>
      <article
        data-testid="mission"
        data-mission-id={mission.id}
        data-type={mission.type}
        data-statut={mission.statut}
        data-xp={mission.xp_prevu}
        className={cn(
          "rounded-2xl border border-border bg-card p-5",
          done && "bg-card/60",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
              done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white/5",
            )}
          >
            {done && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-base font-medium leading-snug", done && "text-muted-foreground")}>{mission.titre}</h3>
            {mission.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{mission.description}</p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {mission.duree_min} min
              </span>
              <span className={cn("rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] tabular-nums", done ? "text-muted-foreground" : "text-brand-gold")}>
                +{mission.xp_prevu} XP
              </span>
              {mission.type === "first" && (
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] tracking-[0.14em] text-primary">
                  PREMIÈRE
                </span>
              )}
              {reportee && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] tracking-[0.14em] text-muted-foreground">
                  REPORTÉE
                </span>
              )}
              {done && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] tracking-[0.14em] text-muted-foreground">
                  FAITE
                </span>
              )}
            </p>
          </div>
        </div>

        {!done && (
          <div className="mt-5">
            <div role="radiogroup" aria-label="Ressenti" className="flex flex-wrap gap-2">
              {RESSENTIS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={ressenti === r}
                  onClick={() => setRessenti(r)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    ressenti === r
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-transparent bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {RESSENTI_LABELS[r]}
                </button>
              ))}
            </div>
            <Button
              type="button"
              data-testid="mission-valider"
              disabled={envoi}
              onClick={() => run(() => onValider(mission, ressenti))}
              className="mt-4 h-12 w-full rounded-full text-sm shadow-none"
            >
              {envoi ? "Validation…" : "Valider"}
            </Button>
            {mission.type === "daily" && (
              <button
                type="button"
                disabled={envoi}
                onClick={() => run(() => onReporter(mission))}
                className="mt-2 w-full py-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
              >
                Reporter à demain
              </button>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

function DateLabel({ iso }: { iso: string }) {
  const [txt, setTxt] = useState("…");
  useEffect(() => {
    setTxt(
      new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [iso]);
  return (
    <time dateTime={iso} className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
      {txt}
    </time>
  );
}

function Journal({ lignes }: { lignes: JournalLigne[] | null }) {
  return (
    <section data-testid="journal" aria-labelledby="journal-title" className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="journal-title" className="text-[11px] tracking-[0.3em] text-muted-foreground">
          SYSTEM LOG
        </h2>
        <Link href="/journal" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Voir tout
        </Link>
      </header>
      {lignes === null ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Rien pour l&apos;instant. Valide une mission.</p>
      ) : (
        <ol className="divide-y divide-border">
          {lignes.map((l) => (
            <li key={l.id} data-testid="journal-ligne" data-log-type={l.type} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm">
              <span className={l.type === "xp_gagnee" ? "text-brand-gold" : ""}>{texteJournal(l)}</span>
              <DateLabel iso={l.created_at} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
