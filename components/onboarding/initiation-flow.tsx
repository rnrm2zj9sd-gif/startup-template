"use client";

import { GoalIcon } from "@/components/onboarding/goal-icon";
import { Button } from "@/components/ui/button";
import {
  GOALS,
  TIME_OPTIONS,
  buildMilestones,
  buildQuestionList,
  isRecommendedSkill,
  weeklyMinutes,
  type GoalId,
} from "@/config/onboarding-data";
import {
  MAX_COMPETENCES_GRATUIT,
  MAX_SECONDARY_GOALS,
  competencesDepuisSkills,
  initiationVide,
  profilDepuisInitiation,
  recapInitiation,
  skillKey,
  skillsPourObjectifs,
  type InitiationState,
} from "@/lib/onboarding";
import { useMoteur } from "@/lib/moteur-store";
import { useProfile } from "@/lib/profile-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { etatInitial } from "@/lib/moteur";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STEPS = ["objectifs", "questions", "competences", "temps", "contrat"] as const;
type Step = (typeof STEPS)[number];

const JOURS = [
  { i: 0, label: "L" },
  { i: 1, label: "M" },
  { i: 2, label: "M" },
  { i: 3, label: "J" },
  { i: 4, label: "V" },
  { i: 5, label: "S" },
  { i: 6, label: "D" },
];

export function InitiationFlow() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const { appliquerContrat } = useMoteur();
  const [step, setStep] = useState<Step>("objectifs");
  const [state, setState] = useState<InitiationState>(initiationVide);
  const [qIndex, setQIndex] = useState(0);

  const questions = useMemo(
    () => (state.primary ? buildQuestionList(state.primary, state.secondary) : []),
    [state.primary, state.secondary],
  );
  const recap = recapInitiation(state);
  const stepIndex = STEPS.indexOf(step);

  function togglePrimary(id: GoalId) {
    setState((prev) => {
      if (prev.primary === id) return { ...prev, primary: null, secondary: prev.secondary.filter((g) => g !== id) };
      return { ...prev, primary: id, secondary: prev.secondary.filter((g) => g !== id) };
    });
  }

  function toggleSecondary(id: GoalId) {
    setState((prev) => {
      if (prev.primary === id) return prev;
      if (prev.secondary.includes(id)) return { ...prev, secondary: prev.secondary.filter((g) => g !== id) };
      if (prev.secondary.length >= MAX_SECONDARY_GOALS) {
        toast.error(`Tu peux ajouter ${MAX_SECONDARY_GOALS} objectifs secondaires.`);
        return prev;
      }
      return { ...prev, secondary: [...prev.secondary, id] };
    });
  }

  function toggleSkill(key: string) {
    setState((prev) => {
      if (prev.skillKeys.includes(key)) return { ...prev, skillKeys: prev.skillKeys.filter((k) => k !== key) };
      const next = [...prev.skillKeys, key];
      if (competencesDepuisSkills(next, prev.primary ?? "finance").length > MAX_COMPETENCES_GRATUIT) {
        toast.error(`Gratuit : ${MAX_COMPETENCES_GRATUIT} compétences actives.`);
        return prev;
      }
      return { ...prev, skillKeys: next };
    });
  }

  function toggleDay(i: number) {
    setState((prev) => {
      const has = prev.days.includes(i);
      const days = has ? prev.days.filter((d) => d !== i) : [...prev.days, i].sort((a, b) => a - b);
      return { ...prev, days: days.length ? days : [i] };
    });
  }

  function goNext() {
    if (step === "objectifs") {
      if (!state.primary) {
        toast.error("Choisis un objectif principal.");
        return;
      }
      setQIndex(0);
      setStep("questions");
      return;
    }
    if (step === "questions") {
      const current = questions[qIndex];
      if (current && state.answers[`${current.goal}.${current.index}`] === undefined) {
        toast.error("Réponds pour continuer.");
        return;
      }
      if (qIndex < questions.length - 1) {
        setQIndex((i) => i + 1);
        return;
      }
      setStep("competences");
      return;
    }
    if (step === "competences") {
      if (!state.skillKeys.length) {
        toast.error("Coche au moins une compétence.");
        return;
      }
      setStep("temps");
      return;
    }
    if (step === "temps") {
      if (!state.time) {
        toast.error("Choisis ton temps disponible.");
        return;
      }
      setStep("contrat");
    }
  }

  function goBack() {
    if (step === "questions" && qIndex > 0) {
      setQIndex((i) => i - 1);
      return;
    }
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  async function finish() {
    if (!state.primary || !state.time) return;
    try {
      const profil = profilDepuisInitiation(state, profile.name.toLowerCase() || "joueur");
      await appliquerContrat(profil, etatInitial());
      updateProfile({
        onboardingDone: true,
        initiation: {
          primary: state.primary,
          secondary: state.secondary,
          skillKeys: state.skillKeys,
          time: state.time,
          customMinutes: state.customMinutes,
          days: state.days,
        },
      });
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
      }
      toast.success("SYSTEM ONLINE", { description: "Ta première mission t'attend." });
      router.push("/dashboard");
    } catch {
      toast.error("Impossible de générer ton contrat. Vérifie tes choix.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">INITIATION</p>
        <div className="h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-brand-purple transition-[width] duration-500 motion-safe:ease-out"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {stepIndex + 1} / {STEPS.length}
        </p>
      </header>

      {step === "objectifs" && (
        <section className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quel est ton objectif ?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Un principal, jusqu&apos;à {MAX_SECONDARY_GOALS} secondaires. Tu pourras en changer plus tard.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((goal) => {
              const principal = state.primary === goal.id;
              const secondaire = state.secondary.includes(goal.id);
              return (
                <li key={goal.id}>
                  <div
                    className={cn(
                      "rounded-2xl border bg-card p-5 transition-colors",
                      principal
                        ? "border-brand-purple/50 bg-panel"
                        : secondaire
                          ? "border-white/15 bg-panel/60"
                          : "border-border",
                    )}
                  >
                    <button type="button" onClick={() => togglePrimary(goal.id)} className="flex w-full gap-3 text-left">
                      <span className="mt-0.5 text-foreground">
                        <GoalIcon path={goal.iconPath} />
                      </span>
                      <span>
                        <span className="text-xs tracking-[0.3em] text-muted-foreground">{goal.title}</span>
                        <span className="mt-1 block text-sm">{goal.headline}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{goal.description}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSecondary(goal.id)}
                      disabled={principal}
                      className="mt-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {principal ? "Objectif principal" : secondaire ? "Retirer le secondaire" : "Ajouter en secondaire"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === "questions" && questions[qIndex] && (
        <QuestionStep
          total={questions.length}
          current={qIndex}
          question={questions[qIndex].question}
          options={questions[qIndex].options}
          selected={state.answers[`${questions[qIndex].goal}.${questions[qIndex].index}`]}
          onSelect={(optionIndex) => {
            const q = questions[qIndex];
            setState((prev) => ({
              ...prev,
              answers: { ...prev.answers, [`${q.goal}.${q.index}`]: optionIndex },
            }));
          }}
        />
      )}

      {step === "competences" && state.primary && (
        <SkillsStep primary={state.primary} secondary={state.secondary} selected={state.skillKeys} onToggle={toggleSkill} />
      )}

      {step === "temps" && (
        <TimeStep state={state} onTime={(time) => setState((p) => ({ ...p, time }))} onCustom={(n) => setState((p) => ({ ...p, customMinutes: n }))} onDay={toggleDay} />
      )}

      {step === "contrat" && recap && state.primary && (
        <section className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ton contrat</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {recap.goal.headline} · niveau {recap.level.toLowerCase()} · {recap.timeLabel}/jour
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-6">
            <p className="text-xs tracking-[0.3em] text-muted-foreground">PREMIÈRE MISSION</p>
            <h2 className="mt-3 text-lg font-semibold">{recap.mission.title}</h2>
            <p className="mt-2 text-sm">{recap.mission.objective}</p>
            <p className="mt-3 text-xs text-muted-foreground">{recap.mission.why}</p>
            <p className="mt-4 font-mono text-sm tabular-nums text-brand-gold">
              {recap.minutes} min · +{recap.xp} XP
            </p>
          </div>
          <ul className="rounded-2xl border border-border bg-card p-5">
            <li className="mb-3 text-xs tracking-[0.3em] text-muted-foreground">JALONS</li>
            {buildMilestones(state.primary, state.answers).map((m) => (
              <li key={m} className="border-t border-border py-3 text-sm first:border-t-0">
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={goBack} disabled={step === "objectifs"} className="text-muted-foreground">
          <ChevronLeft className="mr-1 size-4" aria-hidden />
          Retour
        </Button>
        {step === "contrat" ? (
          <Button type="button" onClick={finish} className="bg-brand-purple text-white hover:bg-brand-purple/90">
            Entrer dans le System
          </Button>
        ) : (
          <Button type="button" onClick={goNext} className="bg-brand-purple text-white hover:bg-brand-purple/90">
            Continuer
          </Button>
        )}
      </footer>
    </div>
  );
}

function QuestionStep({
  total,
  current,
  question,
  options,
  selected,
  onSelect,
}: {
  total: number;
  current: number;
  question: string;
  options: string[];
  selected: number | undefined;
  onSelect: (i: number) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-[0.3em] text-muted-foreground">
          QUESTION {current + 1} / {total}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{question}</h1>
      </div>
      <ul className="grid gap-2">
        {options.map((option, i) => {
          const on = selected === i;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "w-full rounded-2xl border px-5 py-4 text-left text-sm transition-colors",
                  on ? "border-brand-purple/50 bg-brand-purple/15" : "border-border bg-card hover:border-white/15",
                )}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SkillsStep({
  primary,
  secondary,
  selected,
  onToggle,
}: {
  primary: GoalId;
  secondary: GoalId[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const liste = skillsPourObjectifs(primary, secondary);
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tes compétences</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Les trois premières de ton objectif sont recommandées. Rien n&apos;est coché d&apos;office.
        </p>
      </div>
      <ul className="grid gap-2">
        {liste.map((skill) => {
          const key = skillKey(skill.goal, skill.index);
          const on = selected.includes(key);
          const reco = isRecommendedSkill(skill.goal, primary, skill.index);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onToggle(key)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-colors",
                  on ? "border-brand-purple/50 bg-brand-purple/15" : "border-border bg-card hover:border-white/15",
                )}
              >
                <span>
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{skill.description}</span>
                </span>
                {reco && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Reco
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TimeStep({
  state,
  onTime,
  onCustom,
  onDay,
}: {
  state: InitiationState;
  onTime: (id: InitiationState["time"]) => void;
  onCustom: (n: number) => void;
  onDay: (i: number) => void;
}) {
  const minutes = state.time ? weeklyMinutes(state.time, state.days.length, state.customMinutes) : 0;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Combien de temps as-tu ?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Peu, mais souvent. Tu ajustes plus tard.</p>
      </div>
      <ul className="grid gap-2">
        {TIME_OPTIONS.map((opt) => {
          const on = state.time === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onTime(opt.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors",
                  on ? "border-brand-purple/50 bg-brand-purple/15" : "border-border bg-card hover:border-white/15",
                )}
              >
                <span>
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{opt.subLabel}</span>
                </span>
                {opt.tag ? <span className="text-[10px] tracking-[0.2em] text-muted-foreground">{opt.tag}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {state.time === "custom" && (
        <label className="text-xs text-muted-foreground">
          Minutes par jour
          <input
            type="number"
            min={5}
            max={180}
            value={state.customMinutes}
            onChange={(e) => onCustom(Math.min(180, Math.max(5, Number(e.target.value) || 5)))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          />
        </label>
      )}
      <div>
        <p className="text-xs tracking-[0.3em] text-muted-foreground">JOURS</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {JOURS.map((j) => {
            const on = state.days.includes(j.i);
            return (
              <button
                key={`${j.i}-${j.label}`}
                type="button"
                onClick={() => onDay(j.i)}
                className={cn(
                  "size-10 rounded-full border text-xs font-medium",
                  on ? "border-brand-purple/50 bg-brand-purple/15" : "border-border text-muted-foreground",
                )}
              >
                {j.label}
              </button>
            );
          })}
        </div>
        {minutes > 0 && (
          <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">≈ {minutes} min / semaine</p>
        )}
      </div>
    </section>
  );
}
