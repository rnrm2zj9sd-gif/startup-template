import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Dumbbell,
  Hexagon,
  LayoutDashboard,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

/* ---------- Navigation ---------- */

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const dashboardNav: NavItem[] = [
  { label: "Aperçu", href: "/dashboard", icon: LayoutDashboard },
  { label: "Missions", href: "/dashboard/missions", icon: Target },
  { label: "Attributs", href: "/dashboard/attributs", icon: Hexagon },
  { label: "Progression", href: "/dashboard/progression", icon: TrendingUp },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

/* ---------- Attributs ---------- */

export type AttributeKey = "finance" | "physique" | "mental" | "social";

export interface Attribute {
  key: AttributeKey;
  label: string;
  icon: LucideIcon;
  /** Score sur 100. */
  value: number;
  /** Progression sur les 7 derniers jours. */
  weeklyDelta: number;
}

export const demoAttributes: Attribute[] = [
  { key: "finance", label: "Finance", icon: Wallet, value: 42, weeklyDelta: 4 },
  { key: "physique", label: "Physique", icon: Dumbbell, value: 35, weeklyDelta: 6 },
  { key: "mental", label: "Mental", icon: Brain, value: 51, weeklyDelta: 3 },
  { key: "social", label: "Social", icon: Users, value: 28, weeklyDelta: 1 },
];

/* ---------- Missions du jour ---------- */

export interface Mission {
  id: string;
  title: string;
  category: Attribute["label"];
  xp: number;
  done: boolean;
}

export const demoMissions: Mission[] = [
  { id: "m1", title: "Séance de sport (45 min)", category: "Physique", xp: 150, done: true },
  { id: "m2", title: "Relancer deux prospects", category: "Finance", xp: 120, done: true },
  { id: "m3", title: "Lire 20 pages", category: "Mental", xp: 80, done: false },
  { id: "m4", title: "Planifier la semaine", category: "Mental", xp: 100, done: false },
  { id: "m5", title: "Prendre des nouvelles d'un ami", category: "Social", xp: 60, done: false },
];

/* ---------- Série ---------- */

export type DayStatus = "done" | "today" | "upcoming" | "missed";

export interface StreakDay {
  /** Initiale du jour (L, M, M, J, V, S, D). */
  label: string;
  status: DayStatus;
}

export const demoStreak = {
  days: 6,
  best: 14,
  week: [
    { label: "L", status: "done" },
    { label: "M", status: "done" },
    { label: "M", status: "done" },
    { label: "J", status: "done" },
    { label: "V", status: "done" },
    { label: "S", status: "done" },
    { label: "D", status: "today" },
  ] satisfies StreakDay[],
};
