// THEMILION SYSTEM — Paliers visuels du personnage
// Un palier = une tranche de niveaux, une matière, une couleur d'interface et une animation.
// Source unique : modifier ici pour changer les noms, les tranches ou les couleurs.

export type TierKey =
  | "bronze"
  | "argent"
  | "or"
  | "emeraude"
  | "jade"
  | "amethyste"
  | "diamant"
  | "galaxie";

export type TierGender = "male" | "female";

export interface Tier {
  key: TierKey;
  /** Nom affiché en majuscules (ex. « ÉMERAUDE »). */
  name: string;
  min: number;
  /** null = dernier palier, sans limite. */
  max: number | null;
  motto: string;
  sub: string;
  /** Couleur principale du palier (hex). Sert aussi de couleur d'interface. */
  color: string;
  /** Même couleur au format "r, g, b" pour les rgba(). */
  rgb: string;
  /** Texte lisible posé sur la couleur (boutons pleins). */
  onColor: string;
  /** Nom de l'animation de montée de niveau. */
  fxLabel: string;
  /** Fréquence de base du son (Hz) : plus le palier est haut, plus le son est brillant. */
  soundBase: number;
}

export const TIERS: Tier[] = [
  { key: "bronze", name: "BRONZE", min: 1, max: 9, motto: "BASE", sub: "Début du parcours", color: "#E8946A", rgb: "232, 148, 106", onColor: "#1A0E08", fxLabel: "Étincelles", soundBase: 196 },
  { key: "argent", name: "ARGENT", min: 10, max: 19, motto: "STRUCTURE", sub: "Progression solide", color: "#DCE2EC", rgb: "220, 226, 236", onColor: "#0B0D12", fxLabel: "Balayage", soundBase: 220 },
  { key: "or", name: "OR", min: 20, max: 34, motto: "MAÎTRISE", sub: "Discipline renforcée", color: "#F2C14E", rgb: "242, 193, 78", onColor: "#1A1405", fxLabel: "Rayons", soundBase: 247 },
  { key: "emeraude", name: "ÉMERAUDE", min: 35, max: 49, motto: "STABILITÉ", sub: "Équilibre avancé", color: "#34D399", rgb: "52, 211, 153", onColor: "#04150E", fxLabel: "Flux d'énergie", soundBase: 262 },
  { key: "jade", name: "JADE", min: 50, max: 64, motto: "HARMONIE", sub: "Contrôle accru", color: "#A7F3D0", rgb: "167, 243, 208", onColor: "#06140E", fxLabel: "Ondes", soundBase: 294 },
  { key: "amethyste", name: "AMÉTHYSTE", min: 65, max: 79, motto: "ÉLÉVATION", sub: "Puissance intérieure", color: "#C084FC", rgb: "192, 132, 252", onColor: "#140720", fxLabel: "Pulsations", soundBase: 330 },
  { key: "diamant", name: "DIAMANT", min: 80, max: 99, motto: "EXCELLENCE", sub: "Rayonnement", color: "#8DB8FF", rgb: "141, 184, 255", onColor: "#06101F", fxLabel: "Éclats", soundBase: 370 },
  { key: "galaxie", name: "GALAXIE", min: 100, max: null, motto: "TRANSCENDANCE", sub: "Illimité", color: "#A78BFA", rgb: "167, 139, 250", onColor: "#0E0820", fxLabel: "Constellation", soundBase: 392 },
];

export function getTierIndex(level: number): number {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (level >= t.min) idx = i;
  });
  return idx;
}

export function getTier(level: number): Tier {
  return TIERS[getTierIndex(level)];
}

export function getNextTier(level: number): Tier | null {
  return TIERS[getTierIndex(level) + 1] ?? null;
}

/** Niveaux restants avant le palier suivant (null si dernier palier). */
export function levelsToNextTier(level: number): number | null {
  const next = getNextTier(level);
  return next ? Math.max(0, next.min - level) : null;
}

/** Avancement dans le palier courant, de 0 à 1 (basé sur le niveau réel, pas un pourcentage inventé). */
export function tierProgress(level: number): number {
  const t = getTier(level);
  if (t.max === null) return 1;
  return Math.min(1, (level - t.min + 1) / (t.max - t.min + 1));
}

/** Image du personnage pour un palier. Fichiers : /public/character/tiers/<genre>-<palier>.webp */
export function tierImage(tier: Tier, gender: TierGender): string {
  return `/character/tiers/${gender}-${tier.key}.webp?v=10`;
}

export function tierLabel(tier: Tier): string {
  return tier.name.charAt(0) + tier.name.slice(1).toLowerCase();
}
