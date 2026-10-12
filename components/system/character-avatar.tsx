import { cn } from "@/lib/utils";
import type { Gender } from "@/types/player";
import Image from "next/image";

interface CharacterAvatarProps {
  gender: Gender;
  /** Diamètre du cercle en pixels. */
  size?: number;
  className?: string;
}

const LABELS: Record<Gender, string> = {
  male: "Personnage masculin",
  female: "Personnage féminin",
};

/**
 * Miniature ronde cadrée sur la tête du mannequin.
 */
export function CharacterAvatar({ gender, size = 40, className }: CharacterAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full border border-border bg-panel",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/character/${gender}.png`}
        alt={LABELS[gender]}
        fill
        unoptimized
        className="origin-[50%_8%] scale-[2.6] object-cover object-[50%_8%]"
      />
    </span>
  );
}
