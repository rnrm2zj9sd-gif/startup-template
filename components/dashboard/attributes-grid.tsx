"use client";

import { attributsDepuisEtat } from "@/lib/moteur/app";
import { useMoteurPlan } from "@/lib/moteur-store";
import { cn } from "@/lib/utils";

export function AttributesGrid({ className }: { className?: string }) {
  const { etat, semaine, today, hydrated } = useMoteurPlan();
  const attributes = hydrated ? attributsDepuisEtat(etat, semaine, today) : [];

  return (
    <section aria-labelledby="attributes-title" className={className}>
      <h2 id="attributes-title" className="mb-3 text-[11px] tracking-[0.3em] text-muted-foreground">
        ATTRIBUTS PRINCIPAUX
      </h2>
      <ul className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4">
        {attributes.map((attribute, index) => (
          <li
            key={attribute.key}
            className={cn(
              "flex flex-col gap-3 p-5",
              index % 2 === 1 && "border-l border-border",
              index >= 2 && "border-t border-border lg:border-t-0",
              index > 0 && "lg:border-l"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tracking-[0.2em] text-muted-foreground">
                {attribute.label.toUpperCase()}
              </span>
              <attribute.icon className="size-3.5 text-muted-foreground" aria-hidden />
            </div>

            <p className="font-mono text-4xl font-light leading-none tabular-nums">{attribute.value}</p>

            <div
              role="progressbar"
              aria-label={`${attribute.label} : ${attribute.value} sur 100`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={attribute.value}
              className="h-1 overflow-hidden rounded-full bg-white/5"
            >
              <div className="h-full rounded-full bg-brand-purple" style={{ width: `${attribute.value}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground/80">+{attribute.weeklyDelta}</span>{" "}
              cette semaine
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
