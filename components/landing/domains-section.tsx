"use client";

import { domains } from "@/components/landing/domains";
import { SectionHeader } from "@/components/landing/section-header";
import { motion } from "motion/react";

export default function DomainsSection() {
  return (
    <section id="domaines" className="mx-auto max-w-[80rem] px-6 py-14 md:px-8">
      <SectionHeader
        eyebrow="DOMAINES"
        title="Neuf domaines. Un seul personnage."
        description="Chaque mission nourrit un domaine de ta vie. La Life Map montre où tu progresses, et où tu laisses du terrain."
      />

      <ul className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain, idx) => (
          <motion.li
            key={domain.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: (idx % 3) * 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="card-glass flex items-center gap-4 p-4"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-black/30 text-brand-blue">
              <domain.icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{domain.name}</p>
              <p className="truncate text-sm text-muted-foreground">{domain.description}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
