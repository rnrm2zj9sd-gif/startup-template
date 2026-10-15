"use client";

import { useReducedMotion } from "motion/react";
import type { Tier } from "@/lib/tiers";
import { getTierIndex } from "@/lib/tiers";
import "@/components/level-up/level-up.css";

/**
 * Aura permanente autour du mannequin : plus le palier est haut, plus elle est dense.
 * Désactivée avec prefers-reduced-motion.
 */
export function CharacterAura({ tier, compact = false }: { tier: Tier; compact?: boolean }) {
  const reduce = useReducedMotion() ?? false;
  if (reduce) return null;

  const index = getTierIndex(tier.min);
  const rgb = tier.rgb;
  const n = compact ? Math.max(4, 6 + index) : 8 + index * 3;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="absolute inset-x-[8%] bottom-[4%] top-[14%] rounded-full blur-3xl motion-safe:animate-halo"
        style={{ background: `radial-gradient(ellipse at 50% 70%, rgba(${rgb}, 0.38), transparent 68%)` }}
      />

      {tier.key === "or" && (
        <span
          className="lu-rays absolute left-1/2 top-[42%] h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `repeating-conic-gradient(rgba(${rgb}, 0.14) 0deg 5deg, transparent 5deg 22deg)`,
            WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
            maskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
          }}
        />
      )}

      {tier.key === "argent" && (
        <span
          className="lu-scan absolute inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(${rgb}), transparent)`,
            boxShadow: `0 0 18px 4px rgba(${rgb}, 0.45)`,
          }}
        />
      )}

      {(tier.key === "jade" || tier.key === "amethyste") && (
        <span
          className={tier.key === "jade" ? "lu-ripple" : "lu-pulse"}
          style={{
            position: "absolute",
            left: "50%",
            top: "48%",
            width: compact ? 220 : 280,
            height: compact ? 220 : 280,
            marginLeft: compact ? -110 : -140,
            marginTop: compact ? -110 : -140,
            borderRadius: "50%",
            border: `1px solid rgba(${rgb}, 0.4)`,
            boxShadow: `0 0 28px rgba(${rgb}, 0.2)`,
            background:
              tier.key === "amethyste"
                ? `radial-gradient(circle, rgba(${rgb}, 0.28), transparent 65%)`
                : undefined,
          }}
        />
      )}

      {tier.key === "galaxie" && (
        <span
          className="lu-orbit absolute left-1/2 top-[12%] h-[22%] w-[48%] -translate-x-1/2 rounded-full border border-dashed"
          style={{ borderColor: `rgba(${rgb}, 0.4)` }}
        >
          <span
            className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `rgb(${rgb})`, boxShadow: `0 0 10px 3px rgba(${rgb}, 0.7)` }}
          />
        </span>
      )}

      {Array.from({ length: n }, (_, i) => {
        const left = 18 + ((i * 37) % 64);
        const delay = (i * 0.37).toFixed(2);
        const dur = (2.4 + (i % 5) * 0.35).toFixed(2);
        const dx = ((i % 7) - 3) * 10;
        return (
          <span
            key={i}
            className="lu-rise"
            style={{
              position: "absolute",
              left: `${left}%`,
              bottom: "10%",
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              borderRadius: "50%",
              background: `rgb(${rgb})`,
              boxShadow: `0 0 8px 2px rgba(${rgb}, 0.7)`,
              ["--dx" as string]: `${dx}px`,
              ["--dur" as string]: `${dur}s`,
              ["--delay" as string]: `${delay}s`,
            }}
          />
        );
      })}
    </span>
  );
}
