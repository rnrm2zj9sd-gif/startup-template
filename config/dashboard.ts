import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Hexagon,
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const dashboardNav: NavItem[] = [
  { label: "Aujourd'hui", href: "/dashboard", icon: LayoutDashboard },
  { label: "Domaines", href: "/domaines", icon: Hexagon },
  { label: "Compétences", href: "/competences", icon: Sparkles },
  { label: "Progression", href: "/dashboard/progression", icon: TrendingUp },
  { label: "Journal", href: "/journal", icon: BookOpen },
];

export const dashboardNavExtra: NavItem[] = [
  { label: "Mes exercices", href: "/catalogue", icon: Library },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

export type AttributeKey = "finance" | "physique" | "mental" | "social";

export interface Attribute {
  key: AttributeKey;
  label: string;
  icon: LucideIcon;
  value: number;
  weeklyDelta: number;
}

export type DayStatus = "done" | "today" | "upcoming" | "missed";

export interface StreakDay {
  label: string;
  status: DayStatus;
}
