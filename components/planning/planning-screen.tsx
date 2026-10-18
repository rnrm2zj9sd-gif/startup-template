"use client";

import { EventDetail } from "@/components/planning/event-detail";
import { EventForm } from "@/components/planning/event-form";
import { apiAction, apiCreer, apiModifier, usePlanning } from "@/components/planning/use-planning";
import { VueHoraire } from "@/components/planning/vue-horaire";
import { VueMois } from "@/components/planning/vue-mois";
import { Button } from "@/components/ui/button";
import { idsEnConflit } from "@/lib/planning/chevauchements";
import { bornesChargement, decalerVue, joursDuMois, joursSemaine, libellePeriode, ymdDansZone } from "@/lib/planning/dates";
import { KIND_LABELS, VUE_LABELS } from "@/lib/planning/labels";
import { filtreEvenement, statsPeriode } from "@/lib/planning/stats";
import type { CalendarEvent, PlanningFiltre, PlanningVue } from "@/lib/planning/types";
import { DOMAINE_AFFICHE, DOMAINE_LABELS } from "@/lib/progression/config";
import { useProfile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SELECT =
  "h-9 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function PlanningScreen() {
  const { reloadProgression } = useProfile();
  const [vue, setVue] = useState<PlanningVue>("semaine");
  const [ancre, setAncre] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [filtre, setFiltre] = useState<PlanningFiltre>({ kind: "tous", statut: "tous", domaine: "tous" });
  const [form, setForm] = useState<Partial<CalendarEvent> & { date?: string; startHm?: string; endHm?: string } | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  useEffect(() => {
    const large = window.matchMedia("(min-width: 768px)");
    if (!large.matches) setVue("jour");
    setMaintenant(new Date());
    const t = window.setInterval(() => setMaintenant(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const bornes = ancre ? bornesChargement(vue, ancre) : { from: "", to: "" };
  const { events, missions, overlaps, timezone, aujourdHui, loading, error, reload, upsert } = usePlanning(bornes.from, bornes.to);

  const visibles = useMemo(() => events.filter((e) => filtreEvenement(e, filtre)), [events, filtre]);
  const missionsVisibles = useMemo(() => {
    return missions.filter((m) => {
      if (filtre.kind !== "tous" && filtre.kind !== "productive") return false;
      if (filtre.domaine !== "tous" && m.domaine !== filtre.domaine) return false;
      if (filtre.statut === "terminees" && m.statut !== "terminee") return false;
      if (filtre.statut === "ouvertes" && m.statut === "terminee") return false;
      return true;
    });
  }, [missions, filtre]);
  const jours = vue === "jour" ? (ancre ? [ancre] : []) : joursSemaine(ancre || aujourdHui);
  const joursStats = vue === "mois" ? joursDuMois(ancre || aujourdHui) : jours;
  const stats = useMemo(() => {
    const set = new Set(joursStats);
    return statsPeriode(
      visibles.filter((e) => set.has(ymdDansZone(e.start_at, timezone))),
      missionsVisibles.filter((m) => set.has(m.date_locale)),
    );
  }, [visibles, missionsVisibles, joursStats, timezone]);

  const filtreActif = filtre.kind !== "tous" || filtre.statut !== "tous" || filtre.domaine !== "tous";

  async function creer(payload: Record<string, unknown>) {
    setEnvoi(true);
    try {
      const r = await apiCreer(payload);
      upsert(r.event, r.overlaps);
      setForm(null);
      if (r.overlaps.length) toast.message("Créneau enregistré. Il chevauche un autre élément.");
      else toast.success("Tâche planifiée.");
    } finally {
      setEnvoi(false);
    }
  }

  async function modifier(payload: Record<string, unknown>) {
    if (!form?.id) return;
    setEnvoi(true);
    try {
      const r = await apiModifier(form.id, payload);
      upsert(r.event, r.overlaps);
      setForm(null);
      setDetail(r.event);
      toast.success("Modifiée.");
    } finally {
      setEnvoi(false);
    }
  }

  async function deplacer(e: CalendarEvent, startAt: string, endAt: string) {
    const avant = e;
    upsert({ ...e, start_at: startAt, end_at: endAt });
    try {
      const r = await apiModifier(e.id, { startAt, endAt });
      upsert(r.event, r.overlaps);
    } catch (err) {
      upsert(avant);
      toast.error(err instanceof Error ? err.message : "Déplacement impossible.");
    }
  }

  async function action(kind: "terminer" | "reporter" | "annuler" | "demarrer") {
    if (!detail) return;
    setEnvoi(true);
    try {
      const r = await apiAction(detail.id, kind);
      if (kind === "terminer") {
        if (r.deja) toast.message("Déjà validée.");
        else if (r.xp > 0) toast.success(`Tâche terminée · +${r.xp} XP`);
        else toast.success("Enregistré.");
        await reload();
        await reloadProgression();
        setDetail(null);
      } else if (r.event) {
        upsert(r.event);
        setDetail(r.event);
        toast.message(kind === "reporter" ? "Reportée à demain." : kind === "annuler" ? "Annulée." : "En cours.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirForm(date?: string, startHm = "09:00", endHm = "10:00") {
    setForm({ date: date || ancre || aujourdHui, startHm, endHm });
  }

  const resume =
    stats.planifiees === 0
      ? "Rien de prévu sur cette période."
      : `${stats.terminees} terminées sur ${stats.planifiees} · ${stats.xpGagnee} XP gagnés${stats.taux == null ? "" : ` · ${stats.taux} %`}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Planning</h1>
            <p className="mt-0.5 text-sm capitalize text-muted-foreground">{ancre ? libellePeriode(vue, ancre) : "…"}</p>
          </div>
          <Button type="button" onClick={() => ouvrirForm()} className="shrink-0">
            <Plus className="mr-1.5 size-4" /> Nouvelle tâche
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-card">
            <button
              type="button"
              aria-label="Précédent"
              className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => ancre && setAncre(decalerVue(vue, ancre, -1))}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className="h-9 px-3 text-sm hover:text-foreground"
              onClick={() => aujourdHui && setAncre(aujourdHui)}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              aria-label="Suivant"
              className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => ancre && setAncre(decalerVue(vue, ancre, 1))}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="flex rounded-xl border border-border bg-card p-0.5">
            {(["jour", "semaine", "mois"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVue(v)}
                className={cn(
                  "h-8 rounded-lg px-3 text-sm motion-safe:transition-colors",
                  vue === v ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {VUE_LABELS[v]}
              </button>
            ))}
          </div>

          <select
            aria-label="Type"
            className={SELECT}
            value={filtre.kind}
            onChange={(e) => setFiltre((f) => ({ ...f, kind: e.target.value as PlanningFiltre["kind"] }))}
          >
            <option value="tous">Tous les types</option>
            {Object.entries(KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Statut"
            className={SELECT}
            value={filtre.statut}
            onChange={(e) => setFiltre((f) => ({ ...f, statut: e.target.value as PlanningFiltre["statut"] }))}
          >
            <option value="tous">Tous les statuts</option>
            <option value="ouvertes">À faire</option>
            <option value="terminees">Terminées</option>
          </select>
          <select
            aria-label="Pilier"
            className={SELECT}
            value={filtre.domaine}
            onChange={(e) => setFiltre((f) => ({ ...f, domaine: e.target.value as PlanningFiltre["domaine"] }))}
          >
            <option value="tous">Tous les piliers</option>
            {DOMAINE_AFFICHE.map((d) => (
              <option key={d} value={d}>{DOMAINE_LABELS[d]}</option>
            ))}
          </select>
          {filtreActif ? (
            <button
              type="button"
              onClick={() => setFiltre({ kind: "tous", statut: "tous", domaine: "tous" })}
              className="h-9 text-sm text-muted-foreground hover:text-foreground"
            >
              Tout voir
            </button>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          {resume}
          {stats.xpPotentielle > 0 ? (
            <span className="text-brand-gold"> · {stats.xpPotentielle} XP possibles</span>
          ) : null}
        </p>
      </header>

      {loading ? (
        <div className="h-[calc(100dvh-14rem)] min-h-[420px] animate-pulse rounded-2xl border border-border bg-card" />
      ) : error ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <p className="text-sm">{error}</p>
          <Button type="button" className="mt-4" variant="outline" onClick={() => void reload()}>Réessayer</Button>
        </div>
      ) : vue === "mois" ? (
        <VueMois
          ancre={ancre || aujourdHui}
          events={visibles}
          missions={missionsVisibles}
          timezone={timezone}
          aujourdHui={aujourdHui}
          onJour={(ymd) => {
            setAncre(ymd);
            setVue("jour");
          }}
          onSelect={setDetail}
        />
      ) : (
        <VueHoraire
          jours={jours}
          events={visibles}
          missions={missionsVisibles}
          overlaps={overlaps}
          timezone={timezone}
          aujourdHui={aujourdHui}
          maintenant={maintenant}
          onSlot={(date, startHm) => {
            const [h, m] = startHm.split(":").map(Number);
            ouvrirForm(date, startHm, `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          }}
          onSelect={setDetail}
          onMove={(e, startAt, endAt) => void deplacer(e, startAt, endAt)}
          onJour={(ymd) => {
            setAncre(ymd);
            setVue("jour");
          }}
        />
      )}

      {form ? (
        <EventForm
          timezone={timezone}
          initial={form}
          overlapHint={form.id ? idsEnConflit(form.id, overlaps) : false}
          envoi={envoi}
          onClose={() => setForm(null)}
          onSubmit={form.id ? modifier : creer}
        />
      ) : null}

      {detail ? (
        <EventDetail
          event={detail}
          timezone={timezone}
          conflit={idsEnConflit(detail.id, overlaps)}
          envoi={envoi}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setForm(detail);
            setDetail(null);
          }}
          onTerminer={() => void action("terminer")}
          onReporter={() => void action("reporter")}
          onAnnuler={() => void action("annuler")}
          onDemarrer={() => void action("demarrer")}
        />
      ) : null}
    </div>
  );
}
