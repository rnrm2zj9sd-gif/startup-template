"use client";

import { useMemo, type CSSProperties } from "react";
import type { TierKey } from "@/lib/tiers";

type Particle = CSSProperties & Record<`--${string}`, string>;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function make(seed: number, n: number, fn: (r: () => number, i: number) => Particle): Particle[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => fn(r, i));
}

const abs: CSSProperties = { position: "absolute" };

/**
 * Effet visuel propre à chaque palier, joué derrière le personnage pendant la montée de niveau.
 * `delay` (s) décale le départ pour le caler sur l'impact.
 */
export function TierEffects({ tier, seed, delay = 0 }: { tier: TierKey; seed: number; delay?: number }) {
  const d = (s: number) => `${(s + delay).toFixed(2)}s`;

  const fx = useMemo(() => {
    switch (tier) {
      case "bronze":
        return make(seed, 26, (r) => ({ ...abs, left: `${30 + r() * 40}%`, bottom: "14%", width: 2 + r() * 3, height: 2 + r() * 3, borderRadius: "50%", background: "#FFB27A", boxShadow: "0 0 10px 2px rgba(255,140,80,.7)", "--dx": `${Math.round(r() * 120 - 60)}px`, "--dur": `${(2 + r() * 1.6).toFixed(2)}s`, "--delay": d(r() * 1.8) }));
      case "argent":
        return make(seed, 10, (r, i) => ({ ...abs, top: 0, bottom: 0, left: `${8 + i * 9.4}%`, width: 1, background: "linear-gradient(180deg,rgba(255,255,255,0),rgba(226,232,240,.35),rgba(255,255,255,0))", "--dur": `${(2.2 + r() * 1.5).toFixed(2)}s`, "--delay": d(r() * 1.2) }));
      case "or":
        return make(seed, 16, (r) => ({ ...abs, left: `${32 + r() * 36}%`, bottom: "18%", width: 3, height: 3, borderRadius: "50%", background: "#FDE68A", boxShadow: "0 0 10px 3px rgba(242,193,78,.8)", "--dx": `${Math.round(r() * 100 - 50)}px`, "--dur": `${(2.2 + r() * 1.4).toFixed(2)}s`, "--delay": d(0.4 + r() * 1.6) }));
      case "emeraude":
        return make(seed, 18, (r) => ({ ...abs, bottom: 0, left: `${24 + r() * 52}%`, width: 2, height: Math.round(120 + r() * 160), borderRadius: 2, background: "linear-gradient(180deg,rgba(52,211,153,0),rgba(110,231,183,.95))", boxShadow: "0 0 10px rgba(52,211,153,.6)", "--dur": `${(1.6 + r() * 1.2).toFixed(2)}s`, "--delay": d(r() * 1.6) }));
      case "jade":
        return make(seed, 6, (_r, i) => ({ ...abs, left: "50%", top: "45%", width: 900, height: 900, borderRadius: "50%", border: "1.5px solid rgba(167,243,208,.55)", boxShadow: "0 0 30px rgba(167,243,208,.25), inset 0 0 30px rgba(167,243,208,.15)", "--delay": d(i * 0.53) }));
      case "amethyste":
        return make(seed, 4, (_r, i) => ({ ...abs, left: "50%", top: "45%", width: 1100, height: 1100, borderRadius: "50%", border: "2px solid rgba(192,132,252,.6)", boxShadow: "0 0 40px rgba(192,132,252,.35)", "--delay": d(i * 0.4) }));
      case "diamant":
        return make(seed, 30, (r) => {
          const a = r() * Math.PI * 2;
          const dist = 180 + r() * 360;
          const sz = 6 + r() * 10;
          return { ...abs, left: "50%", top: "45%", width: sz, height: sz, background: "linear-gradient(135deg,#fff,#8DB8FF 60%,rgba(141,184,255,.2))", boxShadow: "0 0 12px rgba(141,184,255,.9)", "--dx": `${Math.round(Math.cos(a) * dist)}px`, "--dy": `${Math.round(Math.sin(a) * dist)}px`, "--delay": d(r() * 0.5) };
        });
      case "galaxie":
        return make(seed, 60, (r) => {
          const sz = 1 + r() * 2.2;
          return { ...abs, left: `${r() * 100}%`, top: `${r() * 100}%`, width: sz, height: sz, borderRadius: "50%", background: "#fff", boxShadow: "0 0 6px rgba(196,181,253,.9)", "--dur": `${(1.5 + r() * 3).toFixed(2)}s`, "--delay": d(r() * 2.5) };
        });
    }
  }, [tier, seed, delay]); // eslint-disable-line react-hooks/exhaustive-deps

  const extra = useMemo(() => {
    if (tier === "amethyste") return make(seed + 7, 14, (r) => ({ ...abs, left: `${30 + r() * 40}%`, bottom: "16%", width: 3, height: 3, borderRadius: "50%", background: "#E9D5FF", boxShadow: "0 0 10px 3px rgba(192,132,252,.8)", "--dx": `${Math.round(r() * 140 - 70)}px`, "--dur": `${(2 + r() * 1.5).toFixed(2)}s`, "--delay": d(r() * 1.8) }));
    if (tier === "diamant") return make(seed + 9, 14, (r) => ({ ...abs, left: `${20 + r() * 60}%`, top: `${12 + r() * 70}%`, width: 4, height: 4, transform: "rotate(45deg)", background: "#fff", boxShadow: "0 0 12px 3px rgba(141,184,255,.9)", "--dur": `${(1.2 + r() * 1.6).toFixed(2)}s`, "--delay": d(1 + r() * 1.5) }));
    return [];
  }, [tier, seed, delay]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {tier === "bronze" && fx.map((s, i) => <span key={i} className="lu-rise" style={s} />)}

      {tier === "argent" && (
        <>
          {fx.map((s, i) => <span key={i} className="lu-twinkle" style={s} />)}
          <div className="lu-scan" style={{ ...abs, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,rgba(255,255,255,0),#fff 30%,#fff 70%,rgba(255,255,255,0))", boxShadow: "0 0 24px 6px rgba(226,232,240,.55)", ["--delay" as string]: d(0) }} />
        </>
      )}

      {tier === "or" && (
        <>
          <div className="lu-grow" style={{ ...abs, inset: 0, ["--delay" as string]: d(0) }}>
            <div className="lu-rays" style={{ ...abs, left: "50%", top: "45%", width: 1400, height: 1400, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "repeating-conic-gradient(rgba(242,193,78,.16) 0deg 4deg, rgba(242,193,78,0) 4deg 18deg)", WebkitMaskImage: "radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%)", maskImage: "radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%)" }} />
          </div>
          {fx.map((s, i) => <span key={i} className="lu-rise" style={s} />)}
        </>
      )}

      {tier === "emeraude" && fx.map((s, i) => <span key={i} className="lu-stream" style={s} />)}

      {tier === "jade" && fx.map((s, i) => <span key={i} className="lu-ripple" style={s} />)}

      {tier === "amethyste" && (
        <>
          <div className="lu-pulse" style={{ ...abs, left: "50%", top: "45%", width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle,rgba(176,124,255,.35),rgba(176,124,255,0) 65%)" }} />
          {fx.map((s, i) => <span key={i} className="lu-shock" style={s} />)}
          {extra.map((s, i) => <span key={`e${i}`} className="lu-rise" style={s} />)}
        </>
      )}

      {tier === "diamant" && (
        <>
          {fx.map((s, i) => <span key={i} className="lu-shard" style={s} />)}
          {extra.map((s, i) => <span key={`e${i}`} className="lu-twinkle" style={s} />)}
        </>
      )}

      {tier === "galaxie" && (
        <>
          <div style={{ ...abs, inset: 0, background: "radial-gradient(ellipse 40% 30% at 30% 30%,rgba(124,58,237,.25),transparent 70%),radial-gradient(ellipse 35% 30% at 72% 65%,rgba(59,130,246,.22),transparent 70%)" }} />
          {fx.map((s, i) => <span key={i} className="lu-twinkle" style={s} />)}
          <div className="lu-orbit" style={{ ...abs, left: "50%", top: "45%", width: 520, height: 520, margin: "-260px 0 0 -260px", borderRadius: "50%", border: "1px dashed rgba(167,139,250,.25)" }}>
            <span style={{ ...abs, left: "50%", top: -5, width: 10, height: 10, marginLeft: -5, borderRadius: "50%", background: "#EDE9FE", boxShadow: "0 0 16px 4px rgba(196,181,253,.8)" }} />
          </div>
        </>
      )}
    </div>
  );
}
