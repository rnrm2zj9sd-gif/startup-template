"use client";

import { CharacterPicker } from "@/components/system/character-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATALOGUE, menuDeChoix, type Materiel } from "@/lib/moteur";
import { MATERIEL_LABELS } from "@/lib/moteur/app";
import { useMoteur } from "@/lib/moteur-store";
import {
  BUDGETS_MINUTES,
  COMPETENCES_MAX,
  COMPETENCES_MIN,
  MATERIELS,
  PSEUDO_MAX,
  profilDepuisOnboarding,
  type ChoixOnboarding,
} from "@/lib/onboarding";
import type { MissionRow, ValidateMissionResult } from "@/lib/progression/types";
import { useProfile } from "@/lib/profile-store";
import { formatXP, getXPProgress } from "@/lib/system";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types/player";
import { Check, ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STEPS = ["identite", "competences", "temps", "recap"] as const;
type Step = (typeof STEPS)[number] | "victoire";
type ChoixCompetence = ChoixOnboarding["competences"][number];

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-xs transition-colors",
    on ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-white/15",
  );

export function OnboardingFlow() {
  const router = useRouter();
  const { profile, userId, hydrated, updateProfile, reloadProgression } = useProfile();
  const { updateProfil } = useMoteur();
  const [step, setStep] = useState<Step>("identite");
  const [pseudo, setPseudo] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [competences, setCompetences] = useState<ChoixCompetence[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [materiel, setMateriel] = useState<Materiel[]>(["aucun"]);
  const [envoi, setEnvoi] = useState(false);
  const [mission, setMission] = useState<MissionRow | null>(null);
  const [gain, setGain] = useState<ValidateMissionResult | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setPseudo((p) => p || profile.name);
    setGender(profile.gender);
  }, [hydrated, profile.name, profile.gender]);

  const stepIndex = step === "victoire" ? STEPS.length : STEPS.indexOf(step);

  function toggleCompetence(id: string) {
    setCompetences((prev) => {
      if (prev.some((c) => c.id === id)) return prev.filter((c) => c.id !== id);
      if (prev.length >= COMPETENCES_MAX) {
        toast.error(`${COMPETENCES_MAX} compétences maximum pour commencer.`);
        return prev;
      }
      return [...prev, { id, focusIds: [] }];
    });
  }

  function toggleZone(competenceId: string, focusId: string) {
    const toutes = CATALOGUE[competenceId].focus.map((f) => f.id);
    setCompetences((prev) =>
      prev.map((c) => {
        if (c.id !== competenceId) return c;
        const actives = c.focusIds.length ? c.focusIds : toutes;
        const next = actives.includes(focusId) ? actives.filter((f) => f !== focusId) : [...actives, focusId];
        if (!next.length) {
          toast.error("Garde au moins une zone.");
          return c;
        }
        return { ...c, focusIds: next.length === toutes.length ? [] : next };
      }),
    );
  }

  function goNext() {
    if (step === "identite") {
      if (!pseudo.trim()) return void toast.error("Choisis un pseudo.");
      setStep("competences");
    } else if (step === "competences") {
      if (competences.length < COMPETENCES_MIN) return void toast.error(`Choisis au moins ${COMPETENCES_MIN} compétences.`);
      setStep("temps");
    } else if (step === "temps") {
      if (!budget) return void toast.error("Choisis ton temps par jour.");
      setStep("recap");
    }
  }

  function goBack() {
    const i = STEPS.indexOf(step as (typeof STEPS)[number]);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  async function commencer() {
    if (!budget || envoi) return;
    setEnvoi(true);
    const choix: ChoixOnboarding = { pseudo: pseudo.trim(), gender, competences, budgetMinutes: budget, materiel };
    try {
      const res = await fetch("/api/onboarding/terminer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choix),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible.");
      updateProfile({
        name: choix.pseudo,
        gender,
        onboardingDone: true,
        initiation: { competences, budgetMinutes: budget, materiel },
      });
      updateProfil(profilDepuisOnboarding(userId ?? "", choix));
      setMission(json.mission as MissionRow);
      setStep("victoire");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function validerPremiere() {
    if (!mission || envoi) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/missions/${mission.id}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ressenti: "bien" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Validation impossible.");
      setGain(json as ValidateMissionResult);
      await reloadProgression();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">
          {step === "victoire" ? "PREMIÈRE VICTOIRE" : "INITIATION"}
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-safe:ease-out"
            style={{ width: `${(Math.min(stepIndex + 1, STEPS.length) / STEPS.length) * 100}%` }}
          />
        </div>
        {step !== "victoire" && (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {stepIndex + 1} / {STEPS.length}
          </p>
        )}
      </header>

      {step === "identite" && (
        <section className="flex flex-col gap-6">
          <Titre titre="Qui entre dans le System ?" sous="Ton pseudo et ton personnage. Tu pourras les changer dans Paramètres." />
          <div className="grid gap-2">
            <Label htmlFor="pseudo">Pseudo</Label>
            <Input
              id="pseudo"
              value={pseudo}
              maxLength={PSEUDO_MAX}
              autoComplete="nickname"
              onChange={(e) => setPseudo(e.target.value)}
              className="h-11"
            />
          </div>
          <CharacterPicker value={gender} onChange={setGender} />
        </section>
      )}

      {step === "competences" && (
        <EtapeCompetences choisies={competences} onToggle={toggleCompetence} onZone={toggleZone} />
      )}

      {step === "temps" && (
        <section className="flex flex-col gap-6">
          <Titre titre="Combien de temps par jour ?" sous="Peu, mais tous les jours. Le System partage ce temps entre tes compétences." />
          <div className="grid grid-cols-3 gap-2">
            {BUDGETS_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={budget === m}
                onClick={() => setBudget(m)}
                className={cn(
                  "rounded-2xl border py-4 font-mono text-sm tabular-nums transition-colors",
                  budget === m ? "border-primary/60 bg-primary/15" : "border-border bg-card hover:border-white/15",
                )}
              >
                {m} min
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-muted-foreground">MATÉRIEL</p>
            <p className="mt-1 text-sm text-muted-foreground">Coche ce que tu as sous la main.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MATERIELS.filter((m) => m !== "aucun").map((m) => {
                const on = materiel.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMateriel((prev) => (on ? prev.filter((x) => x !== m) : [...prev, m]))}
                    className={chip(on)}
                  >
                    {MATERIEL_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {step === "recap" && (
        <section className="flex flex-col gap-6">
          <Titre titre="Ton contrat" sous="Vérifie, puis commence. Ta première mission prend 2 minutes." />
          <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
            <Ligne terme="Pseudo" valeur={pseudo.trim()} />
            <Ligne terme="Personnage" valeur={gender === "female" ? "Femme" : "Homme"} />
            <Ligne
              terme="Compétences"
              valeur={competences
                .map((c) => {
                  const comp = CATALOGUE[c.id];
                  const zones = c.focusIds.length
                    ? c.focusIds.map((f) => comp.focus.find((x) => x.id === f)?.nom).join(", ")
                    : "toutes les zones";
                  return `${comp.nom} (${zones})`;
                })
                .join(" · ")}
            />
            <Ligne terme="Temps par jour" valeur={`${budget} min`} />
            <Ligne terme="Matériel" valeur={materiel.map((m) => MATERIEL_LABELS[m]).join(", ")} />
          </dl>
        </section>
      )}

      {step === "victoire" && mission && (
        <Victoire mission={mission} gain={gain} envoi={envoi} onValider={validerPremiere} />
      )}

      <footer className="flex items-center justify-between gap-3">
        {step !== "victoire" ? (
          <>
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === "identite"} className="text-muted-foreground">
              <ChevronLeft className="mr-1 size-4" aria-hidden />
              Retour
            </Button>
            {step === "recap" ? (
              <Button type="button" onClick={commencer} disabled={envoi} className="h-11 px-6">
                {envoi ? "Enregistrement…" : "Commencer"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} className="h-11 px-6">
                Continuer
              </Button>
            )}
          </>
        ) : gain ? (
          <Button type="button" onClick={() => router.replace("/dashboard")} className="h-11 w-full">
            Entrer dans le System
          </Button>
        ) : null}
      </footer>
    </div>
  );
}

function Titre({ titre, sous }: { titre: string; sous: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{sous}</p>
    </div>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-xs tracking-[0.2em] text-muted-foreground">{terme.toUpperCase()}</dt>
      <dd className="text-sm sm:text-right">{valeur}</dd>
    </div>
  );
}

function EtapeCompetences({
  choisies,
  onToggle,
  onZone,
}: {
  choisies: ChoixCompetence[];
  onToggle: (id: string) => void;
  onZone: (competenceId: string, focusId: string) => void;
}) {
  const menu = useMemo(() => Object.entries(menuDeChoix()), []);
  return (
    <section className="flex flex-col gap-6">
      <Titre
        titre="Tes compétences de départ"
        sous={`Choisis-en ${COMPETENCES_MIN} ou ${COMPETENCES_MAX}, puis les zones à travailler. Toutes les zones sont prises par défaut.`}
      />
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {choisies.length} / {COMPETENCES_MAX}
      </p>
      {menu.map(([domaine, liste]) => (
        <div key={domaine} className="flex flex-col gap-2">
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground">{domaine.toUpperCase()}</p>
          {liste.map((c) => {
            const actif = choisies.find((x) => x.id === c.id);
            return (
              <div
                key={c.id}
                className={cn("rounded-2xl border bg-card transition-colors", actif ? "border-primary/50 bg-panel" : "border-border")}
              >
                <button
                  type="button"
                  aria-pressed={Boolean(actif)}
                  onClick={() => onToggle(c.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium">{c.nom}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      actif ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {actif && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
                {actif && (
                  <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
                    {c.focus.map((f) => {
                      const on = !actif.focusIds.length || actif.focusIds.includes(f.id);
                      return (
                        <button key={f.id} type="button" aria-pressed={on} onClick={() => onZone(c.id, f.id)} className={chip(on)}>
                          {f.nom}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function Victoire({
  mission,
  gain,
  envoi,
  onValider,
}: {
  mission: MissionRow;
  gain: ValidateMissionResult | null;
  envoi: boolean;
  onValider: () => void;
}) {
  const { profile } = useProfile();
  const reduce = useReducedMotion() ?? false;
  const progress = getXPProgress(profile.xp, profile.xpNext);

  return (
    <section className="flex flex-col gap-6">
      <Titre
        titre={gain ? "Première victoire." : "Ta première mission"}
        sous={gain ? "Le System t'a crédité. Tes missions du jour t'attendent." : "Deux minutes, maintenant. Fais-la, puis valide."}
      />
      <div className="rounded-2xl border border-border bg-panel p-5 md:p-6">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">MISSION PLANCHER</p>
        <h2 className="mt-3 text-lg font-semibold">{mission.titre}</h2>
        <p className="mt-2 text-sm">{mission.description}</p>
        <p className="mt-4 font-mono text-sm tabular-nums text-brand-gold">
          {mission.duree_min} min · +{gain ? gain.xp : mission.xp_prevu} XP
        </p>
        {!gain && (
          <Button type="button" onClick={onValider} disabled={envoi} className="mt-5 h-11 w-full">
            {envoi ? "Validation…" : "J'ai fait la mission : valider"}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[10px] tracking-[0.28em] text-muted-foreground">NIV.</span>
            <span className="font-mono text-xl font-light tabular-nums">{String(profile.level).padStart(2, "0")}</span>
          </p>
          <p className="font-mono text-xs text-brand-gold">RANG {profile.rank}</p>
        </div>
        <div
          role="progressbar"
          aria-label="Progression d'expérience"
          aria-valuemin={0}
          aria-valuemax={profile.xpNext}
          aria-valuenow={profile.xp}
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          />
        </div>
        <p className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{gain ? <span className="text-brand-gold">+{gain.xp} XP</span> : "XP"}</span>
          <span>
            {formatXP(profile.xp)} / {formatXP(profile.xpNext)} XP
          </span>
        </p>
      </div>
    </section>
  );
}
