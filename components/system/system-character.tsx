import { cn } from "@/lib/utils";
import type { Gender } from "@/types/player";
import Image from "next/image";
import type { CSSProperties } from "react";

interface SystemCharacterProps {
  gender: Gender;
  /** Hauteur affichée en pixels (les visuels sont au ratio 3:4). */
  size: number;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

const LABELS: Record<Gender, string> = {
  male: "Personnage masculin",
  female: "Personnage féminin",
};

/**
 * Personnage du joueur (`/character/male.png` ou `/character/female.png`,
 * fond transparent). Même visuel partout : bloc Système, sidebar, inscription.
 */
export function SystemCharacter({
  gender,
  size,
  priority = false,
  className,
  style,
}: SystemCharacterProps) {
  const width = Math.round(size * 0.75);
  return (
    <Image
      src={`/character/${gender}.png`}
      alt={LABELS[gender]}
      width={width}
      height={size}
      priority={priority}
      unoptimized
      className={cn("max-w-none select-none object-contain", className)}
      style={{ width, height: size, ...style }}
      draggable={false}
    />
  );
}
