"use client";

import { CharacterPedestal } from "@/components/system/character-pedestal";
import { SystemCharacter } from "@/components/system/system-character";
import { useProfile } from "@/lib/profile-store";
import { formatXP, getXPProgress } from "@/lib/system";
import { cn } from "@/lib/utils";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * Bloc Système : le personnage est le sujet.
 * Niveau, classe, rang et barre d'XP restent en bandeau discret en bas.
 */
export function SystemPanel({ className }: { className?: string }) {
  const { profile } = useProfile();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion() ?? false;
  const progress = getXPProgress(profile.xp, profile.xpNext);
  const levelLabel = String(profile.level).padStart(2, "0");

  return (
    <section
      ref={ref}
      aria-label="Bloc Système"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-panel [--glow-color:var(--color-two)]",
        className
      )}
    >
      <div className="relative mx-auto flex min-h-[360px] w-full max-w-md flex-col items-center justify-end px-5 pb-5 pt-6 md:min-h-[400px] md:pb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 bottom-24 top-4 rounded-full bg-brand-purple/20 blur-3xl motion-safe:animate-halo"
        />

        <div className="relative flex h-[280px] w-full items-end justify-center pb-4 md:h-[320px]">
          <CharacterPedestal tone="purple" />

          <motion.div
            className="relative origin-bottom"
            animate={inView && !reduceMotion ? { y: [0, -5, 0] } : undefined}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <SystemCharacter gender={profile.gender} size={300} priority />
          </motion.div>
        </div>

        <div className="relative z-10 mt-1 w-full max-w-xs">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[10px] tracking-[0.28em] text-muted-foreground">NIV.</span>
              <span className="font-mono text-xl font-light tabular-nums">{levelLabel}</span>
            </p>
            <p className="text-[11px] tracking-[0.22em] text-muted-foreground">{profile.className}</p>
            <p className="font-mono text-xs text-brand-gold">{profile.rank}</p>
          </div>

          <div
            role="progressbar"
            aria-label="Progression d'expérience"
            aria-valuemin={0}
            aria-valuemax={profile.xpNext}
            aria-valuenow={profile.xp}
            aria-valuetext={`${formatXP(profile.xp)} XP sur ${formatXP(profile.xpNext)}`}
            className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5"
          >
            <motion.div
              className="h-full rounded-full bg-brand-purple"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: inView ? `${progress}%` : 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 1.4, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }
              }
            />
          </div>
          <p className="mt-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatXP(profile.xp)} / {formatXP(profile.xpNext)} XP
          </p>
        </div>
      </div>
    </section>
  );
}
