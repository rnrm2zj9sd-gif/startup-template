"use client";

import { ModalShell } from "@/components/planning/modal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hmDansZone, instantLocal, ymdDansZone } from "@/lib/planning/dates";
import { DIFF_LABELS, KIND_LABELS } from "@/lib/planning/labels";
import type { CalendarEvent, PlanningDifficulte, PlanningKind } from "@/lib/planning/types";
import { minutesEntre, xpPotentielle } from "@/lib/planning/valider";
import { DOMAINE_AFFICHE, DOMAINE_LABELS } from "@/lib/progression/config";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type Props = {
  timezone: string;
  initial?: Partial<CalendarEvent> & { date?: string; startHm?: string; endHm?: string };
  overlapHint?: boolean;
  envoi: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

export function EventForm({ timezone, initial, overlapHint, envoi, onClose, onSubmit }: Props) {
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kind, setKind] = useState<PlanningKind>(initial?.kind ?? "productive");
  const [domaine, setDomaine] = useState(initial?.domaine ?? "discipline");
  const [difficulte, setDifficulte] = useState<PlanningDifficulte>(initial?.difficulte ?? "moyen");
  const [date, setDate] = useState(initial?.date ?? (initial?.start_at ? ymdDansZone(initial.start_at, timezone) : ""));
  const [startHm, setStartHm] = useState(initial?.startHm ?? (initial?.start_at ? hmDansZone(initial.start_at, timezone) : "09:00"));
  const [endHm, setEndHm] = useState(initial?.endHm ?? (initial?.end_at ? hmDansZone(initial.end_at, timezone) : "10:00"));
  const [erreur, setErreur] = useState<string | null>(null);

  const xp = useMemo(() => {
    const a = instantLocal(date, startHm, timezone);
    const b = instantLocal(date, endHm, timezone);
    return xpPotentielle({ kind, dureeMin: minutesEntre(a, b), difficulte });
  }, [date, startHm, endHm, timezone, kind, difficulte]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    try {
      await onSubmit({
        titre,
        description,
        kind,
        domaine: kind === "productive" ? domaine : null,
        difficulte: kind === "productive" ? difficulte : null,
        startAt: instantLocal(date, startHm, timezone).toISOString(),
        endAt: instantLocal(date, endHm, timezone).toISOString(),
      });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  return (
    <ModalShell titleId="form-planning" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <p className="text-xs tracking-[0.3em] text-muted-foreground">PLANNING</p>
        <h2 id="form-planning" className="mt-1 pr-8 text-lg font-medium">
          {initial?.id ? "Modifier" : "Nouvelle tâche"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Le créneau s&apos;enregistre à ton fuseau.</p>

        <label className="mt-5 block text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-titre">TITRE</label>
        <Input id="pl-titre" value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={80} className="mt-1.5" placeholder="Ex. Réviser 30 min" />

        <fieldset className="mt-4">
          <legend className="text-xs tracking-[0.3em] text-muted-foreground">TYPE</legend>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(["productive", "personnel", "pause"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-xl border px-2 py-2 text-sm motion-safe:transition-colors",
                  kind === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-white/[0.03]",
                )}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-date">DATE</label>
            <Input id="pl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-start">DÉBUT</label>
              <Input id="pl-start" type="time" value={startHm} onChange={(e) => setStartHm(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-end">FIN</label>
              <Input id="pl-end" type="time" value={endHm} onChange={(e) => setEndHm(e.target.value)} required className="mt-1.5" />
            </div>
          </div>
        </div>

        {kind === "productive" ? (
          <>
            <label className="mt-4 block text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-domaine">PILIER</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DOMAINE_AFFICHE.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomaine(d)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs motion-safe:transition-colors",
                    domaine === d ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-white/[0.03]",
                  )}
                >
                  {DOMAINE_LABELS[d]}
                </button>
              ))}
            </div>
            <input id="pl-domaine" type="hidden" value={domaine} readOnly />

            <p className="mt-4 text-xs tracking-[0.3em] text-muted-foreground">DIFFICULTÉ</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(["facile", "moyen", "difficile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulte(d)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm motion-safe:transition-colors",
                    difficulte === d ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-white/[0.03]",
                  )}
                >
                  {DIFF_LABELS[d]}
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-sm tabular-nums text-brand-gold">≈ {xp} XP · crédité à la validation</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Pas d&apos;XP pour ce type.</p>
        )}

        <label className="mt-4 block text-xs tracking-[0.3em] text-muted-foreground" htmlFor="pl-desc">NOTE</label>
        <textarea
          id="pl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Optionnel"
          className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />

        {overlapHint ? <p className="mt-3 text-sm text-muted-foreground">Ce créneau chevauche déjà un autre élément. Tu peux le garder.</p> : null}
        {erreur ? <p className="mt-3 text-sm text-destructive">{erreur}</p> : null}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={envoi}>Annuler</Button>
          <Button type="submit" disabled={envoi} className="flex-1">{envoi ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
