import { CharacterAura } from "@/components/system/character-aura";
import "@/components/level-up/level-up.css";
import { cn } from "@/lib/utils";
import { getTier, getTierIndex, tierImage } from "@/lib/tiers";
import type { Gender } from "@/types/player";
import Image from "next/image";
import type { CSSProperties } from "react";

interface SystemCharacterProps {
  gender: Gender;
  size: number;
  level?: number;
  /** Aura + lueur du palier (désactiver sur les miniatures denses). */
  aura?: boolean;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

const LABELS: Record<Gender, string> = {
  male: "Personnage masculin",
  female: "Personnage féminin",
};

/**
 * Personnage du palier. Avec un niveau, le rendu est déjà teinté
 * (bronze, argent, or…). Sans niveau, mannequin neutre.
 */
export function SystemCharacter({
  gender,
  size,
  level,
  aura = true,
  priority = false,
  className,
  style,
}: SystemCharacterProps) {
  const width = Math.round(size * 0.75);
  const tier = level != null ? getTier(level) : null;
  const index = level != null ? getTierIndex(level) : -1;
  const src = tier ? tierImage(tier, gender) : `/character/${gender}.png`;
  const mask: CSSProperties | undefined = tier
    ? {
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }
    : undefined;

  return (
    <span
      className={cn("relative inline-block select-none", className)}
      style={{ width, height: size, ...style }}
    >
      {tier && aura && <CharacterAura tier={tier} compact={size < 220} />}

      <Image
        src={src}
        alt={LABELS[gender]}
        width={width}
        height={size}
        priority={priority}
        unoptimized
        className="relative z-10 max-w-none object-contain"
        style={{
          width,
          height: size,
          filter: tier ? `drop-shadow(0 0 ${8 + index * 2}px rgba(${tier.rgb}, 0.35))` : undefined,
        }}
        draggable={false}
      />

      {tier && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden" style={mask}>
          <span className="char-shimmer absolute inset-y-0 -left-1/2 w-1/2" />
        </span>
      )}
    </span>
  );
}
