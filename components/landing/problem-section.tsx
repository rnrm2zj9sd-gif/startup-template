"use client";

import { SectionHeader } from "@/components/landing/section-header";
import { EyeOff, Flame, Hourglass, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

const problems = [
  {
    icon: ShieldCheck,
    title: "Manque de discipline",
    description:
      "La volonté s'épuise. Un cadre, lui, tient. Le System structure tes journées pour que la discipline ne dépende plus de ton humeur.",
  },
  {
    icon: Flame,
    title: "Motivation en dents de scie",
    description:
      "Chaque mission accomplie rapporte de l'XP immédiatement. Le feedback est instantané : la motivation ne retombe plus entre deux objectifs.",
  },
  {
    icon: Hourglass,
    title: "Procrastination",
    description:
      "Des missions claires, courtes et datées. Tu sais toujours quelle est la prochaine action à faire, et pourquoi elle compte.",
  },
  {
    icon: EyeOff,
    title: "Progression invisible",
    description:
      "Les habitudes lâchent quand on ne voit pas les résultats. Niveaux, rangs et streaks rendent ta progression visible, mesurable et difficile à abandonner.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problemes" className="mx-auto max-w-[80rem] px-6 py-14 md:px-8">
      <SectionHeader
        eyebrow="LE PROBLÈME"
        title="Tu sais quoi faire. Le System t'aide à le faire."
        description="Les objectifs ne manquent pas. Ce qui manque, c'est un cadre qui te fait avancer chaque jour et te montre que ça marche."
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2">
        {problems.map((problem, idx) => (
          <motion.article
            key={problem.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="card-glass p-6"
          >
            <div className="flex size-11 items-center justify-center rounded-xl border border-brand-blue/30 bg-brand-blue/15 text-brand-blue">
              <problem.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{problem.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {problem.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
