"use client";

import { colonnesChevauchement, idsEnConflit } from "@/lib/planning/chevauchements";
import { HEURE_DEBUT, HEURE_FIN, PX_PAR_HEURE, hmDansZone, minutesDepuisMinuit, ymdDansZone } from "@/lib/planning/dates";
import type { CalendarEvent, PlanningChevauchement, PlanningMission } from "@/lib/planning/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const HEURES = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => i + HEURE_DEBUT);
const COL_MIN = 156;

type Props = {
  jours: string[];
  events: CalendarEvent[];
  missions: PlanningMission[];
  overlaps: PlanningChevauchement[];
  timezone: string;
  aujourdHui: string;
  maintenant: Date | null;
  onSlot: (ymd: string, hm: string) => void;
  onSelect: (e: CalendarEvent) => void;
  onMove: (e: CalendarEvent, startAt: string, endAt: string) => void;
  onJour?: (ymd: string) => void;
};

function styleKind(kind: CalendarEvent["kind"], terminee: boolean) {
  if (kind === "productive") {
    return terminee
      ? "border-l-primary/50 bg-primary/10 text-foreground/75"
      : "border-l-primary bg-primary/15 text-foreground";
  }
  if (kind === "pause") return "border-l-white/20 bg-white/[0.03] text-muted-foreground";
  return "border-l-foreground/30 bg-white/[0.06] text-foreground";
}

function hmDepuisY(y: number): string {
  const minutes = HEURE_DEBUT * 60 + Math.round(((y / PX_PAR_HEURE) * 60) / 15) * 15;
  const h = Math.min(HEURE_FIN - 1, Math.max(HEURE_DEBUT, Math.floor(minutes / 60)));
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function VueHoraire({
  jours,
  events,
  missions,
  overlaps,
  timezone,
  aujourdHui,
  maintenant,
  onSlot,
  onSelect,
  onMove,
  onJour,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const hauteur = (HEURE_FIN - HEURE_DEBUT) * PX_PAR_HEURE;
  const jourUnique = jours.length === 1;
  const cleJours = jours.join("|");
  const nowTop = useMemo(() => {
    if (!maintenant) return null;
    const ymd = ymdDansZone(maintenant.toISOString(), timezone);
    if (!jours.includes(ymd)) return null;
    const min = minutesDepuisMinuit(maintenant.toISOString(), timezone);
    return ((min - HEURE_DEBUT * 60) / 60) * PX_PAR_HEURE;
  }, [maintenant, timezone, jours]);

  useEffect(() => {
    if (nowTop == null || !scroller.current) return;
    scroller.current.scrollTop = Math.max(0, nowTop - 160);
  }, [nowTop, cleJours]);

  const aDesMissions = jours.some((j) => missions.some((m) => m.date_locale === j));
  const cols = `64px repeat(${jours.length}, minmax(${jourUnique ? "0" : `${COL_MIN}px`}, 1fr))`;

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid shrink-0 border-b border-border bg-card" style={{ gridTemplateColumns: cols }}>
        <div />
        {jours.map((j) => {
          const d = new Date(`${j}T00:00:00Z`);
          const nom = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d).replace(".", "");
          const num = Number(j.slice(8));
          const today = j === aujourdHui;
          return (
            <button
              key={j}
              type="button"
              title={onJour ? "Voir ce jour" : undefined}
              onClick={() => onJour?.(j)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-3 text-center",
                onJour && "hover:bg-white/[0.04]",
                today && "bg-primary/[0.07]",
              )}
            >
              <span className={cn("text-sm capitalize", today ? "text-primary" : "text-muted-foreground")}>{nom}</span>
              <span
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center px-1.5 font-mono text-base tabular-nums",
                  today && "rounded-full bg-primary text-primary-foreground",
                )}
              >
                {num}
              </span>
            </button>
          );
        })}
      </div>

      {aDesMissions ? (
        <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: cols }}>
          <div className="flex items-center justify-end px-2 text-xs text-muted-foreground">{jourUnique ? "" : "Jour"}</div>
          {jours.map((j) => (
            <BandeauMissions
              key={j}
              missions={missions.filter((m) => m.date_locale === j)}
              etendu={jourUnique}
              today={j === aujourdHui}
            />
          ))}
        </div>
      ) : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: cols, minWidth: jourUnique ? undefined : 64 + jours.length * COL_MIN }}
        >
          <div className="relative" style={{ height: hauteur }}>
            {HEURES.map((h) => (
              <div
                key={h}
                className="absolute right-2 font-mono text-xs tabular-nums text-muted-foreground"
                style={{ top: (h - HEURE_DEBUT) * PX_PAR_HEURE - 7 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {jours.map((j) => (
            <ColonneJour
              key={j}
              ymd={j}
              today={j === aujourdHui}
              events={events.filter((e) => ymdDansZone(e.start_at, timezone) === j && e.statut !== "annulee")}
              overlaps={overlaps}
              timezone={timezone}
              hauteur={hauteur}
              nowTop={j === aujourdHui ? nowTop : null}
              onSlot={onSlot}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BandeauMissions({
  missions,
  etendu,
  today,
}: {
  missions: PlanningMission[];
  etendu: boolean;
  today: boolean;
}) {
  if (!missions.length) return <div className={cn("min-h-9", today && "bg-primary/[0.04]")} />;
  const restantes = missions.filter((m) => m.statut !== "terminee");
  if (!etendu) {
    return (
      <div className={cn("flex min-h-9 items-center px-2 text-sm", today && "bg-primary/[0.04]")}>
        <span className="text-muted-foreground">
          {restantes.length === 0 ? "Jour ok" : `${restantes.length} mission${restantes.length > 1 ? "s" : ""}`}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("px-3 py-2", today && "bg-primary/[0.04]")}>
      <p className="text-sm text-muted-foreground">
        {restantes.length === 0 ? "Missions du jour terminées" : `${restantes.length} mission${restantes.length > 1 ? "s" : ""} à faire`}
      </p>
      {restantes.slice(0, 4).map((m) => (
        <p key={m.id} className="mt-1 truncate text-sm">{m.titre}</p>
      ))}
    </div>
  );
}

function ColonneJour({
  ymd,
  today,
  events,
  overlaps,
  timezone,
  hauteur,
  nowTop,
  onSlot,
  onSelect,
  onMove,
}: {
  ymd: string;
  today: boolean;
  events: CalendarEvent[];
  overlaps: PlanningChevauchement[];
  timezone: string;
  hauteur: number;
  nowTop: number | null;
  onSlot: (ymd: string, hm: string) => void;
  onSelect: (e: CalendarEvent) => void;
  onMove: (e: CalendarEvent, startAt: string, endAt: string) => void;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const press = useRef({ y: 0, moved: false });
  const layout = useMemo(
    () =>
      colonnesChevauchement(
        events.map((e) => ({
          id: e.id,
          start: minutesDepuisMinuit(e.start_at, timezone),
          end: minutesDepuisMinuit(e.end_at, timezone),
        })),
      ),
    [events, timezone],
  );

  return (
    <div
      className={cn("relative border-l border-border", today && "bg-primary/[0.04]")}
      style={{ height: hauteur }}
      onPointerDown={(ev) => {
        press.current = { y: ev.clientY, moved: false };
      }}
      onPointerMove={(ev) => {
        if (Math.abs(ev.clientY - press.current.y) > 8) press.current.moved = true;
        if ((ev.target as HTMLElement).closest("button")) {
          setHint(null);
          return;
        }
        const rect = ev.currentTarget.getBoundingClientRect();
        setHint(hmDepuisY(ev.clientY - rect.top));
      }}
      onPointerLeave={() => setHint(null)}
      onClick={(ev) => {
        if (press.current.moved) return;
        const rect = ev.currentTarget.getBoundingClientRect();
        onSlot(ymd, hmDepuisY(ev.clientY - rect.top));
      }}
    >
      {HEURES.map((h) => (
        <div key={h} className="absolute inset-x-0 border-t border-white/[0.045]" style={{ top: (h - HEURE_DEBUT) * PX_PAR_HEURE }} />
      ))}
      {hint ? (
        <div
          className="pointer-events-none absolute inset-x-1 z-[1] rounded-md border border-dashed border-white/15 bg-white/[0.03] px-2 py-1 text-sm text-muted-foreground"
          style={{
            top: ((Number(hint.slice(0, 2)) * 60 + Number(hint.slice(3)) - HEURE_DEBUT * 60) / 60) * PX_PAR_HEURE,
            height: PX_PAR_HEURE - 4,
          }}
        >
          + {hint}
        </div>
      ) : null}
      {nowTop != null && nowTop >= 0 && nowTop <= hauteur ? (
        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
          <div className="absolute -left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
          <div className="border-t border-primary" />
        </div>
      ) : null}
      {events.map((e) => {
        const startMin = minutesDepuisMinuit(e.start_at, timezone);
        const endMin = minutesDepuisMinuit(e.end_at, timezone);
        const top = ((startMin - HEURE_DEBUT * 60) / 60) * PX_PAR_HEURE;
        const height = Math.max(36, ((endMin - startMin) / 60) * PX_PAR_HEURE - 4);
        const conflit = idsEnConflit(e.id, overlaps);
        const place = layout.get(e.id) ?? { col: 0, cols: 1 };
        const terminee = e.statut === "terminee";
        return (
          <button
            key={e.id}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(e);
            }}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              if (terminee || e.statut === "annulee") return;
              const originY = ev.clientY;
              const start = Date.parse(e.start_at);
              const duree = Date.parse(e.end_at) - start;
              ev.currentTarget.setPointerCapture(ev.pointerId);
              ev.currentTarget.style.cursor = "grabbing";
              const move = (p: PointerEvent) => {
                const deltaMin = Math.round((((p.clientY - originY) / PX_PAR_HEURE) * 60) / 15) * 15;
                ev.currentTarget.style.transform = `translateY(${(deltaMin / 60) * PX_PAR_HEURE}px)`;
                ev.currentTarget.dataset.delta = String(deltaMin);
              };
              const up = (p: PointerEvent) => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                ev.currentTarget.style.transform = "";
                ev.currentTarget.style.cursor = "";
                const deltaMin = Number(ev.currentTarget.dataset.delta ?? 0);
                if (Math.abs(p.clientY - originY) < 8 || !deltaMin) return;
                const ns = new Date(start + deltaMin * 60_000);
                onMove(e, ns.toISOString(), new Date(ns.getTime() + duree).toISOString());
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
            className={cn(
              "absolute z-[2] cursor-grab overflow-hidden rounded-lg border border-transparent border-l-[3px] px-2 py-1.5 text-left hover:bg-white/[0.04]",
              styleKind(e.kind, terminee),
              conflit && "ring-1 ring-white/25",
            )}
            style={{
              top: Math.max(0, top),
              height,
              left: `calc(4px + ${place.col} * (100% - 8px) / ${place.cols})`,
              width: `calc((100% - 8px) / ${place.cols} - 3px)`,
            }}
          >
            <span className="flex items-start gap-1.5">
              {terminee ? <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> : null}
              <span className={cn("min-w-0 truncate text-sm font-medium", terminee && "text-foreground/70 line-through decoration-white/30")}>
                {e.titre}
              </span>
            </span>
            <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">
              {hmDansZone(e.start_at, timezone)} – {hmDansZone(e.end_at, timezone)}
              {e.kind === "productive" ? ` · ${terminee ? `+${e.xp_gagne ?? 0}` : `≈${e.xp_prevu}`} XP` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
