"use client";

import { SectionHeader } from "@/components/landing/section-header";
import { Award, Brain, Flame, Gauge, Map, Target, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: Zap,
    title: "XP et niveaux",
    description:
      "Chaque mission accomplie te rapporte de l'XP. Accumule-la, monte de niveau, débloque la suite.",
  },
  {
    icon: Trophy,
    title: "Rangs",
    description:
      "De E à S. Ton rang reflète ta constance sur la durée, pas un coup d'éclat.",
  },
  {
    icon: Target,
    title: "Missions quotidiennes",
    description:
      "Chaque matin, le System génère tes priorités du jour. Claires, atteignables, alignées sur tes objectifs.",
  },
  {
    icon: Flame,
    title: "Streaks",
    description:
      "Enchaîne les jours. Plus la série est longue, plus elle pèse, et moins tu as envie de la casser.",
  },
  {
    icon: Brain,
    title: "Coach IA",
    description:
      "Analyse tes patterns, repère les domaines négligés, ajuste la difficulté. Un coach, pas un chatbot.",
  },
  {
    icon: Gauge,
    title: "Performance Score",
    description:
      "Un seul chiffre pour ta progression globale. Simple à suivre, motivant à faire grimper.",
  },
  {
    icon: Map,
    title: "Life Map",
    description:
      "La vue d'ensemble de tes neuf domaines de vie. Repère les déséquilibres en un coup d'œil.",
  },
  {
    icon: Award,
    title: "Succès",
    description:
      "Des paliers à débloquer qui marquent les étapes de ton parcours. Collectionne-les, partage-les.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-[80rem] px-6 py-14 md:px-8">
      <SectionHeader
        eyebrow="FONCTIONNALITÉS"
        title="Un System complet pour monter de niveau dans la vraie vie."
        description="Tout ce qui fait tenir un jeu sur la durée, appliqué à tes objectifs : récompenses immédiates, progression lisible et un coach qui s'adapte à toi."
      />

      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (idx % 4) * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="card-glass flex flex-col p-6"
          >
            <div className="flex size-11 items-center justify-center rounded-xl border border-brand-gold/30 bg-brand-gold/15 text-brand-gold">
              <feature.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {feature.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
