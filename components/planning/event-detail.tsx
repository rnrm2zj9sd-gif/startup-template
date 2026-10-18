"use client";

import { ModalShell } from "@/components/planning/modal-shell";
import { Button } from "@/components/ui/button";
import { hmDansZone, parseYmd, ymdDansZone } from "@/lib/planning/dates";
import { DIFF_LABELS, KIND_LABELS, STATUT_LABELS, labelPilier } from "@/lib/planning/labels";
import type { CalendarEvent } from "@/lib/planning/types";
import { cn } from "@/lib/utils";

function minutesEventSafeLocal(e: CalendarEvent): number {
  return Math.max(0, Math.round((Date.parse(e.end_at) - Date.parse(e.start_at)) / 60_000));
}

type Props = {
  event: CalendarEvent;
  timezone: string;
  conflit: boolean;
  envoi: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTerminer: () => void;
  onReporter: () => void;
  onAnnuler: () => void;
  onDemarrer: () => void;
};

export function EventDetail({
  event,
  timezone,
  conflit,
  envoi,
  onClose,
  onEdit,
  onTerminer,
  onReporter,
  onAnnuler,
  onDemarrer,
}: Props) {
  const ouverte = event.statut === "planifiee" || event.statut === "en_cours" || event.statut === "reportee";
  const minutes = minutesEventSafeLocal(event);
  const jour = ymdDansZone(event.start_at, timezone);
  const dateLisible = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseYmd(jour));

  return (
    <ModalShell titleId="detail-planning" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">{KIND_LABELS[event.kind].toUpperCase()}</p>
        <span className={cn(
          "rounded-full border border-border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase text-muted-foreground",
          event.statut === "terminee" && "border-primary/40 text-primary",
          event.statut === "en_cours" && "border-brand-gold/40 text-brand-gold",
        )}>
          {STATUT_LABELS[event.statut]}
        </span>
      </div>
      <h2 id="detail-planning" className="mt-2 text-lg font-medium">{event.titre}</h2>
      {event.description ? <p className="mt-2 text-sm text-muted-foreground">{event.description}</p> : null}

      <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
        <Ligne label="Date" valeur={dateLisible} />
        <Ligne
          label="Horaire"
          valeur={`${hmDansZone(event.start_at, timezone)} – ${hmDansZone(event.end_at, timezone)}`}
          mono
        />
        <Ligne label="Durée" valeur={`${minutes} min`} mono />
        {event.kind === "productive" ? (
          <>
            <Ligne label="Pilier" valeur={labelPilier(event.domaine)} />
            <Ligne label="Difficulté" valeur={event.difficulte ? DIFF_LABELS[event.difficulte] : "—"} />
            <Ligne label="XP potentielle" valeur={String(event.xp_prevu)} or />
            <Ligne
              label="XP gagnée"
              valeur={event.statut === "terminee" ? String(event.xp_gagne ?? 0) : "—"}
              or
            />
          </>
        ) : (
          <div className="col-span-2 text-sm text-muted-foreground">Aucun XP pour ce type.</div>
        )}
      </dl>

      {conflit ? <p className="mt-4 text-sm text-muted-foreground">Chevauche un autre créneau. Tu peux le garder.</p> : null}

      <div className="mt-6 flex flex-col gap-2">
        {ouverte && event.kind === "productive" ? (
          <Button type="button" disabled={envoi} onClick={onTerminer}>
            {envoi ? "Validation…" : "Terminer et gagner l'XP"}
          </Button>
        ) : null}
        {ouverte && event.kind !== "productive" ? (
          <Button type="button" disabled={envoi} onClick={onTerminer}>Marquer comme fait</Button>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {ouverte && event.statut !== "en_cours" ? (
            <Button type="button" variant="secondary" disabled={envoi} onClick={onDemarrer}>Commencer</Button>
          ) : null}
          {ouverte ? (
            <>
              <Button type="button" variant="outline" disabled={envoi} onClick={onReporter}>Reporter</Button>
              <Button type="button" variant="ghost" disabled={envoi} onClick={onEdit}>Modifier</Button>
              <Button type="button" variant="ghost" disabled={envoi} onClick={onAnnuler}>Annuler</Button>
            </>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}

function Ligne({ label, valeur, mono, or }: { label: string; valeur: string; mono?: boolean; or?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.22em] text-muted-foreground">{label.toUpperCase()}</dt>
      <dd className={cn("mt-1", !mono && !or && "capitalize", (mono || or) && "font-mono tabular-nums", or && "text-brand-gold")}>
        {valeur}
      </dd>
    </div>
  );
}
