"use client";

import { AttributesGrid } from "@/components/dashboard/attributes-grid";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CATALOGUE } from "@/lib/moteur";
import { labelAttribut } from "@/lib/moteur/app";
import { useMoteur } from "@/lib/moteur-store";

export default function AttributsPage() {
  const { profil, etat } = useMoteur();

  return (
    <>
      <DashboardHeader title="Attributs" description="Finance, physique, mental, social." />
      <AttributesGrid />

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">COMPÉTENCES ACTIVES</h2>
        {profil.choix.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune compétence choisie.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {profil.choix.map((choix) => {
              const competence = CATALOGUE[choix.competenceId];
              if (!competence) return null;
              const zones = (choix.focusIds.length ? choix.focusIds : competence.focus.map((f) => f.id))
                .map((id) => {
                  const nom = competence.focus.find((f) => f.id === id)?.nom ?? id;
                  const prog = etat.progression[`${choix.competenceId}:${id}`];
                  return { nom, prog };
                });
              return (
                <li key={choix.competenceId}>
                  <p className="text-sm">
                    {competence.nom}
                    <span className="text-muted-foreground"> · {labelAttribut(choix.competenceId)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {zones
                      .map((z) => (z.prog ? `${z.nom} niv. ${z.prog.niveau}` : z.nom))
                      .join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
