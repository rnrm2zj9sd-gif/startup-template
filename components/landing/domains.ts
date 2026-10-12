import {
  BookOpen,
  Briefcase,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Leaf,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface Domain {
  name: string;
  description: string;
  icon: LucideIcon;
}

/** Les neuf domaines de vie suivis par le System. */
export const domains: Domain[] = [
  { name: "Business", description: "Projets, clients, chiffre d'affaires.", icon: Briefcase },
  { name: "Sport", description: "Séances, performances, régularité.", icon: Dumbbell },
  { name: "Études", description: "Cours, révisions, nouvelles compétences.", icon: GraduationCap },
  { name: "Finance", description: "Épargne, budget, investissements.", icon: Wallet },
  { name: "Santé", description: "Sommeil, alimentation, énergie.", icon: HeartPulse },
  { name: "Discipline", description: "Routines tenues, engagements respectés.", icon: ShieldCheck },
  { name: "Vie sociale", description: "Relations, famille, réseau.", icon: Users },
  { name: "Culture", description: "Lectures, découvertes, curiosité.", icon: BookOpen },
  { name: "Bien-être", description: "Calme, équilibre, temps pour soi.", icon: Leaf },
];
