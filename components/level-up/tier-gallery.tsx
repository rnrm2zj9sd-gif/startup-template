"use client";

import { SystemCharacter } from "@/components/system/system-character";
import { useProfile } from "@/lib/profile-store";
import { TIERS, getNextTier, getTierIndex, levelsToNextTier, tierLabel, tierProgress } from "@/lib/tiers";
import { useLevelUp } from "./level-up-provider";

/** Galerie des paliers. Le personnage reste le mannequin System, teinté. */
export function TierGallery({
  level: levelOverride,
  unlockAll = false,
}: {
  level?: number;
  unlockAll?: boolean;
}) {
  const { profile } = useProfile();
  const { previewTier } = useLevelUp();
  const level = levelOverride ?? profile.level;
  const current = getTierIndex(level);
  const cur = TIERS[current];
  const next = getNextTier(level);
  const left = levelsToNextTier(level);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Palier actuel"
        className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-border bg-card p-6"
        style={{ borderColor: `rgba(${cur.rgb}, 0.35)` }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.24em] text-muted-foreground">PALIER ACTUEL</span>
          <span className="text-2xl font-semibold tracking-[0.3em]" style={{ color: "var(--tier)" }}>
            {cur.name}
          </span>
          <span className="text-sm text-muted-foreground">
            Niveau {level} · {cur.motto} — {cur.sub}
          </span>
        </div>
        <div className="flex min-w-[240px] max-w-md flex-1 flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{next ? `Encore ${left} niveau${left && left > 1 ? "x" : ""} avant ${tierLabel(next)}` : "Palier ultime atteint"}</span>
            <span className="font-mono">{cur.max ? `${cur.min} → ${cur.max}` : `${cur.min} +`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.round(tierProgress(level) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
        {TIERS.map((t, i) => {
          const locked = unlockAll ? false : i > current;
          const isCurrent = i === current;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => previewTier(i)}
              aria-label={`${tierLabel(t)}${locked ? ", verrouillé" : ""} : voir l'animation`}
              className="flex flex-col overflow-hidden rounded-2xl border bg-card text-center transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-primary"
              style={
                isCurrent
                  ? { borderColor: t.color, boxShadow: `0 0 0 4px rgba(${t.rgb}, 0.13)` }
                  : { borderColor: "var(--border)" }
              }
            >
              <div className="relative flex h-72 items-end justify-center overflow-hidden bg-panel">
                <div
                  className={locked ? "opacity-30 grayscale" : undefined}
                >
                  <SystemCharacter gender={profile.gender} level={t.min} size={260} aura={isCurrent} />
                </div>
                {locked && (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.18em] text-muted-foreground">
                    NIVEAU {t.min} REQUIS
                  </span>
                )}
                {isCurrent && (
                  <span
                    className="absolute left-3 top-3 rounded-md px-2 py-1 text-[9px] font-semibold tracking-[0.2em]"
                    style={{ background: t.color, color: t.onColor }}
                  >
                    ACTUEL
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 px-4 pb-5 pt-3">
                <span
                  className="text-base font-semibold tracking-[0.22em]"
                  style={{ color: locked ? undefined : t.color }}
                >
                  {t.name}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {t.max ? `NIVEAUX ${t.min} – ${t.max}` : `NIVEAU ${t.min} +`}
                </span>
                <span className="text-xs text-muted-foreground">{t.sub}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
