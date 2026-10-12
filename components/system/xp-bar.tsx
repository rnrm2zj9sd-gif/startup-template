"use client";

import { formatXP, getXPProgress } from "@/lib/system";
import { cn } from "@/lib/utils";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect } from "react";

interface XPBarProps {
  xp: number;
  xpNextLevel: number;
  /** Déclenche l'animation de remplissage (ex. quand le bloc entre dans le viewport). */
  animate?: boolean;
  /** Couleur du remplissage : bleu → or (landing) ou violet (dashboard). */
  tone?: "blue" | "purple";
  /** Barre seule, sans libellés (le parent affiche déjà les chiffres). */
  compact?: boolean;
  className?: string;
}

const FILL_TONES = {
  blue: "bg-gradient-to-r from-brand-blue to-brand-gold",
  purple: "bg-gradient-to-r from-brand-purple/80 to-brand-purple",
} as const;

const FILL_EASE = [0.21, 0.47, 0.32, 0.98] as const;
const FILL_DURATION = 1.4;
const FILL_DELAY = 0.3;

/**
 * Barre d'XP du System : le remplissage et le compteur montent ensemble,
 * la pointe de la barre pulse et un reflet balaie la jauge périodiquement.
 * Avec prefers-reduced-motion : valeurs affichées directement, aucun mouvement en boucle.
 */
export function XPBar({
  xp,
  xpNextLevel,
  animate: shouldAnimate = true,
  tone = "blue",
  compact = false,
  className,
}: XPBarProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const progress = getXPProgress(xp, xpNextLevel);

  // Valeur d'XP animée : pilote à la fois le compteur et la largeur de la barre.
  const xpValue = useMotionValue(0);
  const width = useTransform(xpValue, (v) => `${getXPProgress(v, xpNextLevel)}%`);
  const xpLabel = useTransform(xpValue, (v) => formatXP(Math.round(v)));
  const remainingLabel = useTransform(xpValue, (v) =>
    formatXP(Math.max(xpNextLevel - Math.round(v), 0))
  );

  useEffect(() => {
    const target = shouldAnimate ? xp : 0;
    if (reduceMotion) {
      xpValue.set(target);
      return;
    }
    const controls = animate(xpValue, target, {
      duration: FILL_DURATION,
      delay: shouldAnimate ? FILL_DELAY : 0,
      ease: FILL_EASE,
    });
    return () => controls.stop();
  }, [shouldAnimate, xp, reduceMotion, xpValue]);

  return (
    <div className={cn("w-full", className)}>
      {!compact && (
        <div className="flex items-baseline justify-between text-xs tracking-[0.3em] text-muted-foreground">
          <span>EXPERIENCE</span>
          <span className="font-mono tracking-normal tabular-nums">
            <motion.span>{xpLabel}</motion.span> / {formatXP(xpNextLevel)} XP
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpNextLevel}
        aria-valuenow={xp}
        aria-valuetext={`${formatXP(xp)} XP sur ${formatXP(xpNextLevel)} (${Math.round(progress)} %)`}
        aria-label="Progression d'expérience"
        className={cn(
          "relative h-3 overflow-hidden rounded-full border border-border bg-white/5",
          !compact && "mt-3"
        )}
      >
        {/* Remplissage */}
        <motion.div
          className={cn("relative h-full rounded-full", FILL_TONES[tone])}
          style={{ width }}
        >
          {/* Pointe lumineuse qui pulse */}
          <span
            aria-hidden
            className="absolute right-0 top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_var(--color-three)] motion-safe:animate-edge-glow"
          />
        </motion.div>

        {/* Reflet qui balaie la barre (uniquement si le mouvement est autorisé) */}
        {!reduceMotion && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: ["-100%", "900%"] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              repeatDelay: 2.6,
              ease: "easeInOut",
              delay: FILL_DELAY + FILL_DURATION,
            }}
          />
        )}
      </div>

      {!compact && (
        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          <motion.span className="font-mono tabular-nums text-foreground/80">
            {remainingLabel}
          </motion.span>{" "}
          XP avant le prochain niveau
        </p>
      )}
    </div>
  );
}
