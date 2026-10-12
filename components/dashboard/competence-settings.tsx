"use client";

import { Button } from "@/components/ui/button";
import { menuDeChoix, type ChoixCompetence, type Materiel } from "@/lib/moteur";
import { MATERIEL_LABELS } from "@/lib/moteur/app";
import { useMoteur } from "@/lib/moteur-store";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const MATERIEL_OPTIONS: Materiel[] = [
  "aucun",
  "papier_stylo",
  "telephone",
  "ordinateur",
  "halteres",
  "elastique",
  "barre_traction",
  "banc",
  "corde_a_sauter",
];

function cloneChoix(choix: ChoixCompetence[]): ChoixCompetence[] {
  return choix.map((c) => ({ ...c, focusIds: [...c.focusIds] }));
}

export function CompetenceSettings() {
  const { profil, updateProfil, hydrated } = useMoteur();
  const menu = useMemo(() => menuDeChoix(profil.catalogPerso), [profil.catalogPerso]);
  const [choix, setChoix] = useState<ChoixCompetence[]>(() => cloneChoix(profil.choix));
  const [materiel, setMateriel] = useState<Materiel[]>(profil.materiel);
  const [budget, setBudget] = useState(profil.budgetMinutesJour);

  useEffect(() => {
    if (!hydrated) return;
    setChoix(cloneChoix(profil.choix));
    setMateriel(profil.materiel);
    setBudget(profil.budgetMinutesJour);
  }, [hydrated, profil]);

  const dirty =
    JSON.stringify(choix) !== JSON.stringify(profil.choix) ||
    JSON.stringify(materiel) !== JSON.stringify(profil.materiel) ||
    budget !== profil.budgetMinutesJour;

  function toggleCompetence(id: string) {
    setChoix((prev) => {
      if (prev.some((c) => c.competenceId === id)) return prev.filter((c) => c.competenceId !== id);
      return [...prev, { competenceId: id, focusIds: [], seancesParSemaine: 3, minutesMax: 10 }];
    });
  }

  function patchChoix(id: string, patch: Partial<ChoixCompetence>) {
    setChoix((prev) => prev.map((c) => (c.competenceId === id ? { ...c, ...patch } : c)));
  }

  function toggleFocus(competenceId: string, focusId: string) {
    setChoix((prev) =>
      prev.map((c) => {
        if (c.competenceId !== competenceId) return c;
        const has = c.focusIds.includes(focusId);
        return { ...c, focusIds: has ? c.focusIds.filter((f) => f !== focusId) : [...c.focusIds, focusId] };
      })
    );
  }

  function toggleMateriel(id: Materiel) {
    setMateriel((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextMateriel = materiel.includes("aucun") ? materiel : (["aucun", ...materiel] as Materiel[]);
    updateProfil({ choix, materiel: [...new Set(nextMateriel)], budgetMinutesJour: budget });
    toast.success("Tes compétences sont à jour.");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-xs tracking-[0.3em] text-muted-foreground">TEMPS</h2>
        <p className="mt-1 text-sm text-muted-foreground">Plafond par jour, toutes les séances confondues.</p>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Budget</span>
          <input
            type="range"
            min={15}
            max={60}
            step={5}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1 accent-[var(--color-two)]"
          />
          <span className="font-mono tabular-nums">{budget} min</span>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-xs tracking-[0.3em] text-muted-foreground">MATÉRIEL</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {MATERIEL_OPTIONS.map((id) => {
            const on = materiel.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleMateriel(id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  on
                    ? "border-brand-purple/50 bg-brand-purple/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-white/15"
                )}
              >
                {MATERIEL_LABELS[id]}
              </button>
            );
          })}
        </div>
      </section>

      {Object.entries(menu).map(([domaine, competences]) => (
        <section key={domaine} className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xs tracking-[0.3em] text-muted-foreground">{domaine.toUpperCase()}</h2>
          <ul className="mt-4 space-y-4">
            {competences.map((comp) => {
              const actif = choix.find((c) => c.competenceId === comp.id);
              const zones = comp.focus;
              return (
                <li key={comp.id} className="rounded-xl border border-border bg-panel/40 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {comp.nom}
                      {comp.perso && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Perso
                        </span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(actif)}
                      onChange={() => toggleCompetence(comp.id)}
                      className="size-4 accent-[var(--color-two)]"
                    />
                  </label>
                  {actif && (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {zones.map((f) => {
                          const all = actif.focusIds.length === 0;
                          const on = all || actif.focusIds.includes(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                if (all) {
                                  patchChoix(comp.id, {
                                    focusIds: zones.filter((x) => x.id !== f.id).map((x) => x.id),
                                  });
                                } else {
                                  toggleFocus(comp.id, f.id);
                                }
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs",
                                on
                                  ? "border-brand-purple/50 bg-brand-purple/15"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {f.nom}
                              {f.perso ? " · Perso" : ""}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Toutes les zones si aucune n&apos;est décochée.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-muted-foreground">
                          Séances / semaine
                          <input
                            type="number"
                            min={1}
                            max={7}
                            value={actif.seancesParSemaine}
                            onChange={(e) =>
                              patchChoix(comp.id, {
                                seancesParSemaine: Math.min(7, Math.max(1, Number(e.target.value) || 1)),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Minutes max
                          <input
                            type="number"
                            min={5}
                            max={40}
                            step={5}
                            value={actif.minutesMax}
                            onChange={(e) =>
                              patchChoix(comp.id, {
                                minutesMax: Math.min(40, Math.max(5, Number(e.target.value) || 5)),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty} className="bg-brand-purple text-white hover:bg-brand-purple/90">
          Enregistrer les compétences
        </Button>
        {dirty && <p className="text-xs text-muted-foreground">Modifications non enregistrées.</p>}
      </div>
    </form>
  );
}
