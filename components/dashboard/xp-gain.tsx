"use client";

import { motion, useReducedMotion } from "motion/react";

/** Flash +XP après une validation. Or réservé à l'XP. */
export function XpGainBurst({ xp }: { xp: number }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.p
      role="status"
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="font-mono text-sm tabular-nums text-brand-gold"
    >
      +{xp} XP
    </motion.p>
  );
}
