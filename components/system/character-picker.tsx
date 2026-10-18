"use client";

import { SystemCharacter } from "@/components/system/system-character";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types/player";
import { Check } from "lucide-react";

interface CharacterPickerProps {
  value: Gender;
  onChange: (gender: Gender) => void;
  className?: string;
}

const OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
];

/** Deux cartes Homme / Femme avec aperçu du personnage. */
export function CharacterPicker({ value, onChange, className }: CharacterPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Choisis ton personnage"
      className={cn("grid grid-cols-2 gap-3 sm:gap-4", className)}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-testid={`gender-${option.value}`}
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-4 pt-6 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              selected
                ? "border-primary/60 bg-panel"
                : "border-border hover:border-white/15 hover:bg-panel"
            )}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" aria-hidden />
              </span>
            )}
            <div className="relative flex h-40 items-end justify-center">
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-4 bottom-2 top-6 rounded-full bg-primary blur-2xl transition-opacity",
                  selected ? "opacity-30" : "opacity-15"
                )}
              />
              <SystemCharacter
                gender={option.value}
                size={160}
                className={cn("relative transition-opacity", !selected && "opacity-70 group-hover:opacity-100")}
              />
            </div>
            <span className={cn("font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
