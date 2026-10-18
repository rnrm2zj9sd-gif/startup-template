"use client";

import { BorderBeam } from "@/components/magicui/border-beam";
import { CharacterPedestal } from "@/components/system/character-pedestal";
import { SystemCharacter } from "@/components/system/system-character";
import { XPBar } from "@/components/system/xp-bar";
import { RANG_SEUILS } from "@/lib/progression/config";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/player";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

interface SystemBlockProps {
  player: UserProfile;
  className?: string;
}

/**
 * Bloc « Système » : identité du joueur, niveau et progression d'XP,
 * avec le personnage à gauche. Carte verre THEMILION + faisceau de bordure.
 *
 * Animations : halo qui pulse, respiration du personnage, socle holographique
 * et barre d'XP (remplissage, compteur, reflet). Avec prefers-reduced-motion,
 * seules de courtes apparitions en fondu subsistent.
 */
export function SystemBlock({ player, className }: SystemBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion() ?? false;

  const reveal = (delay: number) =>
    reduceMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: inView ? 1 : 0 },
          transition: { duration: 0.3 },
        }
      : {
          initial: { opacity: 0, y: 12 },
          animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
          transition: { duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
        };

  return (
    <div
      ref={ref}
      className={cn(
        "card-glass relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl p-6 text-left md:p-10",
        className
      )}
    >
      {/* Dégradé de fond bleu → or (identité du System) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-blue/15 via-transparent to-brand-gold/10"
      />
      {/* Grille fine type HUD */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      {!reduceMotion && (
        <BorderBeam
          size={200}
          duration={12}
          delay={11}
          colorFrom="var(--color-one)"
          colorTo="var(--color-two)"
        />
      )}

      <div className="relative grid gap-8 md:grid-cols-[minmax(0,220px)_1fr] md:gap-12">
        {/* Personnage */}
        <motion.div
          {...reveal(0.1)}
          className="relative mx-auto flex h-64 w-full max-w-[220px] items-end justify-center pb-6 md:h-full md:min-h-[320px]"
        >
          {/* Halo : deux couches (bleu + violet) qui respirent en décalé */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-4 bottom-10 top-2 rounded-full bg-brand-blue/25 blur-3xl motion-safe:animate-halo"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-10 bottom-16 top-10 rounded-full bg-brand-purple/20 blur-3xl motion-safe:animate-halo [animation-delay:-2.5s]"
          />

          {/* Socle holographique */}
          <CharacterPedestal />

          {/* Respiration : légère montée + dilatation depuis la base */}
          <motion.div
            className="relative origin-bottom"
            animate={inView && !reduceMotion ? { y: [0, -6, 0], scale: [1, 1.025, 1] } : undefined}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <SystemCharacter
              gender={player.gender}
              size={280}
              priority
              className="drop-shadow-[0_0_18px_var(--color-one)] motion-safe:animate-glow"
            />
          </motion.div>
        </motion.div>

        {/* Identité + niveau + XP */}
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <motion.div {...reveal(0.2)}>
            <div className="flex items-center gap-2 text-xs tracking-[0.5em] text-brand-blue">
              <span
                aria-hidden
                className="relative flex size-2"
              >
                <span className="absolute inline-flex size-full rounded-full bg-brand-blue opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-blue" />
              </span>
              SYSTEM ONLINE
            </div>
            <p className="mt-4 text-xs tracking-[0.3em] text-muted-foreground">
              PLAYER IDENTIFIED
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              {player.name}
            </h2>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-brand-blue/30 bg-brand-blue/15 px-4 py-1.5 tracking-[0.15em] text-brand-blue">
                {player.className}
              </span>
              <span className="rounded-full border border-brand-gold/30 bg-brand-gold/15 px-4 py-1.5 font-medium tracking-[0.2em] text-brand-gold">
                RANK {player.rank}
              </span>
            </div>
          </motion.div>

          <motion.div {...reveal(0.3)} className="flex items-end gap-6">
            <div>
              <p className="text-xs tracking-[0.3em] text-muted-foreground">LEVEL</p>
              <p className="mt-1 font-mono text-6xl font-light leading-none tabular-nums md:text-7xl">
                {player.level}
              </p>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">
              Prochain rang&nbsp;:{" "}
              <span className="font-medium text-foreground/90">{nextRankLabel(player.level)}</span>
            </p>
          </motion.div>

          <motion.div {...reveal(0.4)}>
            <XPBar xp={player.xp} xpNextLevel={player.xpNext} animate={inView} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** Libellé du prochain palier de rang (ex. « C au niveau 20 »). */
function nextRankLabel(level: number): string {
  const next = [...RANG_SEUILS].sort((a, b) => a.niveau - b.niveau).find((s) => level < s.niveau);
  return next ? `${next.rang} au niveau ${next.niveau}` : "Rang maximal atteint";
}
