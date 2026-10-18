"use client";

import { debutMois, grilleMois, hmDansZone, ymdDansZone } from "@/lib/planning/dates";
import type { CalendarEvent, PlanningMission } from "@/lib/planning/types";
import { cn } from "@/lib/utils";

type Props = {
  ancre: string;
  events: CalendarEvent[];
  missions: PlanningMission[];
  timezone: string;
  aujourdHui: string;
  onJour: (ymd: string) => void;
  onSelect: (e: CalendarEvent) => void;
};

function pastille(kind: CalendarEvent["kind"], terminee: boolean) {
  if (kind === "productive") return terminee ? "bg-primary/40" : "bg-primary";
  if (kind === "pause") return "bg-white/25";
  return "bg-foreground/45";
}

export function VueMois({ ancre, events, missions, timezone, aujourdHui, onJour, onSelect }: Props) {
  const mois = debutMois(ancre).slice(0, 7);
  const cases = grilleMois(ancre);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-xs text-muted-foreground">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="px-1 py-3">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cases.map((ymd) => {
          const duMois = ymd.startsWith(mois);
          const today = ymd === aujourdHui;
          const locaux = events.filter((e) => e.statut !== "annulee" && ymdDansZone(e.start_at, timezone) === ymd);
          const mis = missions.filter((m) => m.date_locale === ymd);
          const visible = locaux.slice(0, 3);
          const extra = Math.max(0, locaux.length - visible.length) + mis.length;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onJour(ymd)}
              className={cn(
                "min-h-[118px] border-b border-r border-border p-2 text-left hover:bg-white/[0.03]",
                !duMois && "opacity-40",
                today && "bg-primary/[0.07]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center px-1 font-mono text-sm tabular-nums",
                  today && "rounded-full bg-primary text-primary-foreground",
                  !today && "text-muted-foreground",
                )}
              >
                {Number(ymd.slice(8))}
              </span>
              <ul className="mt-1.5 space-y-1">
                {visible.map((e) => (
                  <li key={e.id}>
                    <span
                      role="presentation"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onSelect(e);
                      }}
                      className="flex items-center gap-1.5 truncate rounded px-0.5 text-xs hover:bg-white/5"
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", pastille(e.kind, e.statut === "terminee"))} />
                      <span className="font-mono tabular-nums text-muted-foreground">{hmDansZone(e.start_at, timezone)}</span>
                      <span className={cn("truncate", e.statut === "terminee" && "text-muted-foreground line-through")}>{e.titre}</span>
                    </span>
                  </li>
                ))}
                {extra > 0 ? (
                  <li className="px-0.5 text-xs text-muted-foreground">+{extra} autres</li>
                ) : null}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
