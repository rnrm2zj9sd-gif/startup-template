"use client";

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SystemCharacter } from "@/components/system/system-character";
import { impactDelay, playLevelUpSound } from "@/lib/level-up-sound";
import { TIERS, getTierIndex, type TierGender } from "@/lib/tiers";
import { TierEffects } from "./tier-effects";
import "./level-up.css";

export interface LevelUpEvent {
  id: number;
  fromLevel: number;
  toLevel: number;
  gender: TierGender;
  /** Force la version « nouveau palier » (aperçu depuis la galerie). */
  forceTier?: boolean;
}

export function LevelUpOverlay({ event, onClose }: { event: LevelUpEvent | null; onClose: () => void }) {
  return <AnimatePresence>{event && <Overlay key={event.id} event={event} onClose={onClose} />}</AnimatePresence>;
}

function Overlay({ event, onClose }: { event: LevelUpEvent; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const fromIdx = getTierIndex(event.fromLevel);
  const toIdx = getTierIndex(event.toLevel);
  const big = event.forceTier || toIdx !== fromIdx;
  const tier = TIERS[toIdx];
  const impact = reduce ? 0 : impactDelay(big);
  const [hit, setHit] = useState(reduce);
  const shake = useAnimationControls();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const c = tier.color;
  const rgb = tier.rgb;

  useEffect(() => {
    playLevelUpSound(toIdx, big);
    const t1 = window.setTimeout(() => {
      setHit(true);
      if (!reduce) {
        void shake.start({
          x: big ? [0, -12, 10, -8, 6, -3, 0] : [0, -5, 4, -2, 0],
          y: big ? [0, 7, -6, 4, -2, 1, 0] : [0, 3, -2, 1, 0],
          transition: { duration: big ? 0.55 : 0.35, ease: "easeOut" },
        });
      }
    }, impact * 1000);
    const t2 = window.setTimeout(() => buttonRef.current?.focus(), (impact + 1.3) * 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const after = (s: number) => ({ delay: impact + s });

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: `radial-gradient(ellipse 60% 55% at 50% 45%, rgba(${rgb}, 0.2), rgba(5,6,9,0.97) 70%), rgba(5,6,9,0.97)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <motion.div animate={shake} className="absolute inset-0 flex items-center justify-center">
        {/* Charge : faisceau vertical qui grandit jusqu'à l'impact */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-full w-[220px] -translate-x-1/2 origin-bottom"
            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(${rgb}, 0.25) 55%, rgba(255,255,255,0.35) 85%, rgba(255,255,255,0) 100%)`, filter: "blur(26px)" }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: [0, 1, 1], opacity: [0, 1, 0.55] }}
            transition={{ duration: impact + 0.6, times: [0, impact / (impact + 0.6), 1], ease: "easeOut" }}
          />
        )}

        {/* Impact : flash, onde de choc et effet du palier */}
        {hit && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 45%, rgba(${rgb}, 0.75), rgba(255,255,255,0) 60%)` }}
              initial={{ opacity: reduce ? 0 : 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            {!reduce && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[45%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ border: `2px solid ${c}`, boxShadow: `0 0 40px rgba(${rgb}, 0.6), inset 0 0 40px rgba(${rgb}, 0.3)` }}
                initial={{ scale: 0.2, opacity: 0.95 }}
                animate={{ scale: big ? 4 : 2.6, opacity: 0 }}
                transition={{ duration: big ? 1.3 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              />
            )}
            {!reduce && <TierEffects tier={tier.key} seed={event.id % 100000} />}
          </>
        )}

        {/* Contenu */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <motion.span
            className="text-[11px] tracking-[0.5em] text-[#C9CCD6]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ...after(0.1) }}
          >
            {big ? "NOUVEAU PALIER DÉBLOQUÉ" : "NIVEAU SUPÉRIEUR"}
          </motion.span>

          {/* Personnage : l'ancien palier se charge, puis se transforme à l'impact */}
          <div className="relative flex h-[clamp(240px,46vh,440px)] items-end justify-center">
            {!hit && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: impact, ease: "easeIn" }}
              >
                <SystemCharacter gender={event.gender} level={event.fromLevel} size={360} />
              </motion.div>
            )}
            {hit && (
              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <SystemCharacter gender={event.gender} level={event.toLevel} size={360} />
              </motion.div>
            )}
          </div>

          {/* Compteur de niveau qui roule de l'ancien au nouveau */}
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] tracking-[0.3em] text-[#9299AA]">NIVEAU</span>
            <span className="relative inline-flex h-[1.1em] overflow-hidden text-5xl font-semibold tabular-nums leading-none" style={{ color: c }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={hit ? "to" : "from"}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {hit ? event.toLevel : event.fromLevel}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>

          {big && (
            <motion.h2
              id="levelup-title"
              className="m-0 pl-[0.42em] text-[clamp(32px,5vw,54px)] font-semibold"
              style={{ color: c, textShadow: `0 0 30px rgba(${rgb}, 0.45)` }}
              initial={{ opacity: 0, letterSpacing: "0.9em", y: 8 }}
              animate={{ opacity: 1, letterSpacing: "0.42em", y: 0 }}
              transition={{ duration: 1, ...after(0.2), ease: [0.2, 0.8, 0.2, 1] }}
            >
              {tier.name}
            </motion.h2>
          )}
          {!big && (
            <h2 id="levelup-title" className="sr-only">
              Niveau {event.toLevel} atteint
            </h2>
          )}

          <motion.span
            className="text-sm text-[#C9CCD6]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ...after(big ? 0.6 : 0.3) }}
          >
            {tier.motto} — {tier.sub}
          </motion.span>

          <motion.button
            ref={buttonRef}
            type="button"
            data-testid="level-up-continuer"
            onClick={onClose}
            className="mt-3 inline-flex min-h-12 items-center rounded-xl px-8 text-xs font-medium tracking-[0.22em] text-[#F5F5F7] outline-none focus-visible:ring-2"
            style={{ border: `1px solid rgba(${rgb}, 0.55)`, background: `rgba(${rgb}, 0.12)` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ background: `rgba(${rgb}, 0.22)` }}
            transition={{ duration: 0.5, ...after(big ? 0.9 : 0.5) }}
          >
            CONTINUER
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
