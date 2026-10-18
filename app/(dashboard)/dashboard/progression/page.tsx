"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressionStats } from "@/components/dashboard/progression-stats";
import { useLevelUp } from "@/components/level-up/level-up-provider";
import { TierGallery } from "@/components/level-up/tier-gallery";
import { TierTheme } from "@/components/level-up/tier-theme";
import { SystemCharacter } from "@/components/system/system-character";
import { CATALOGUE, PALIERS_PAR_NIVEAU } from "@/lib/moteur";
import { useMoteur } from "@/lib/moteur-store";
import { useProfile } from "@/lib/profile-store";
import { useProgression } from "@/lib/progression/use-progression";
import { TIERS, getTier, getTierIndex } from "@/lib/tiers";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

export default function ProgressionPage() {
  const { profile } = useProfile();
  const { previewTier } = useLevelUp();
  const reduce = useReducedMotion() ?? false;
  const { etat, hydrated } = useMoteur();
  const { data: snap, loading: snapLoading } = useProgression();
  const [preview, setPreview] = useState(profile.level || 1);
  const tier = getTier(preview);

  function goToLevel(next: number, cinematic: boolean) {
    const before = getTier(preview);
    const after = getTier(next);
    setPreview(next);
    if (cinematic && after.key !== before.key) {
      previewTier(getTierIndex(next));
    }
  }
  const lignes = Object.entries(etat.progression).sort((a, b) => {
    if (b[1].niveau !== a[1].niveau) return b[1].niveau - a[1].niveau;
    return b[1].palier - a[1].palier;
  });

  return (
    <>
      <TierTheme level={preview} />
      <DashboardHeader title="Progression" description="Power, classe, discipline, et l'historique d'XP." />

      {snapLoading || !snap ? (
        <p className="mb-5 text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <ProgressionStats snap={snap} />
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.3em] text-muted-foreground">APERÇU DES PALIERS</p>
            <p className="mt-2 text-2xl font-semibold tracking-[0.2em] text-primary">
              {tier.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Niveau {preview} · {tier.motto} — {tier.sub}
            </p>
          </div>
          <div className="relative flex h-[260px] w-[200px] items-end justify-center overflow-visible">
            <motion.div
              key={tier.key}
              initial={reduce ? false : { opacity: 0, scale: 0.9, filter: "brightness(2.6)" }}
              animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
              transition={{ duration: 1.15, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <SystemCharacter gender={profile.gender} level={preview} size={250} priority />
            </motion.div>
          </div>
        </div>
        <label className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
          <span className="flex justify-between font-mono tabular-nums">
            <span>niv. 1</span>
            <span style={{ color: "var(--tier)" }}>{preview}</span>
            <span>100+</span>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={preview}
            onChange={(e) => goToLevel(Number(e.target.value), false)}
            className="w-full accent-[var(--tier)]"
          />
        </label>
        <ol className="mt-4 flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => goToLevel(t.min, true)}
                className="rounded-full border px-3 py-1 text-[10px] tracking-[0.18em]"
                style={
                  getTier(preview).key === t.key
                    ? { borderColor: t.color, color: t.color }
                    : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                }
              >
                {t.name}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <TierGallery level={preview} unlockAll />

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">ZONES</h2>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Chaîne {snap?.serie.serie ?? "—"} j
          </p>
        </div>

        {!hydrated ? (
          <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Termine ta première séance : les niveaux de compétences apparaissent ici.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {lignes.map(([cle, prog]) => {
              const [competenceId, focusId] = cle.split(":");
              const competence = CATALOGUE[competenceId];
              const focus = competence?.focus.find((f) => f.id === focusId);
              const fill = (prog.palier / PALIERS_PAR_NIVEAU) * 100;
              return (
                <li key={cle}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">
                      {competence?.nom ?? competenceId}
                      <span className="text-muted-foreground"> · {focus?.nom ?? focusId}</span>
                    </p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      niv. {prog.niveau} · {prog.palier}/{PALIERS_PAR_NIVEAU}
                    </p>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Palier ${prog.palier} sur ${PALIERS_PAR_NIVEAU}`}
                    aria-valuemin={0}
                    aria-valuemax={PALIERS_PAR_NIVEAU}
                    aria-valuenow={prog.palier}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
