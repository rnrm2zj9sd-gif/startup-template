import { cn } from "@/lib/utils";

export type PedestalTone = "blue" | "purple";

interface CharacterPedestalProps {
  tone?: PedestalTone;
  className?: string;
}

const TONES: Record<
  PedestalTone,
  { disc: string; dashed: string; inner: string; ripple: string }
> = {
  blue: {
    disc: "bg-brand-blue/30",
    dashed: "border-brand-blue/50",
    inner: "border-brand-blue/35",
    ripple: "border-brand-blue/40",
  },
  purple: {
    disc: "bg-brand-purple/30",
    dashed: "border-brand-purple/50",
    inner: "border-brand-purple/35",
    ripple: "border-brand-purple/40",
  },
};

/**
 * Socle holographique sous le personnage : disque lumineux qui respire,
 * anneau pointillé en rotation lente et ondes qui se propagent.
 * Toutes les animations sont désactivées avec prefers-reduced-motion
 * (variantes `motion-safe:`), le socle reste alors statique.
 */
export function CharacterPedestal({ tone = "blue", className }: CharacterPedestalProps) {
  const t = TONES[tone];
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-center justify-center [perspective:600px]",
        className
      )}
    >
      <div className="relative size-44 [transform:rotateX(74deg)] [transform-style:preserve-3d]">
        {/* Disque lumineux */}
        <div className={cn("absolute inset-5 rounded-full blur-xl motion-safe:animate-halo", t.disc)} />

        {/* Anneau pointillé en rotation */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border border-dashed motion-safe:animate-pedestal-spin",
            t.dashed
          )}
        />

        {/* Anneau intérieur fixe */}
        <div className={cn("absolute inset-7 rounded-full border", t.inner)} />

        {/* Ondes */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border motion-safe:animate-pedestal-ripple",
            t.ripple
          )}
        />
        <div className="absolute inset-0 rounded-full border border-brand-gold/30 motion-safe:animate-pedestal-ripple [animation-delay:1.6s]" />
      </div>
    </div>
  );
}
