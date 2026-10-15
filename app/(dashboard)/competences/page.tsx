"use client";

import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PALIERS_PAR_NIVEAU } from "@/lib/moteur";
import { useMoteur } from "@/lib/moteur-store";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Zone = { id: string; nom: string; niveau: number; palier: number };
type Active = {
  id: string;
  nom: string;
  domaine: string;
  domaineLabel: string;
  niveau: number;
  palier: number;
  zones: Zone[];
};
type CatalogItem = { id: string; nom: string; domaine: string; domaineLabel: string; active: boolean };

export default function CompetencesPage() {
  const { reload: reloadMoteur } = useMoteur();
  const [actives, setActives] = useState<Active[] | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogItem[]>([]);
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/me/competences");
    if (!res.ok) return;
    const json = (await res.json()) as { actives: Active[]; catalogue: CatalogItem[]; min: number; max: number };
    setActives(json.actives);
    setCatalogue(json.catalogue);
    setMin(json.min);
    setMax(json.max);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function ajouter(id: string) {
    setBusy(id);
    const res = await fetch("/api/me/competences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ competenceId: id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Ajout impossible.");
      return;
    }
    toast.success("Compétence ajoutée. Effet dès demain.");
    await Promise.all([reload(), reloadMoteur()]);
  }

  async function retirer(id: string) {
    setBusy(id);
    const res = await fetch("/api/me/competences", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ competenceId: id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Retrait impossible.");
      return;
    }
    toast.message("Compétence retirée. Sa progression est conservée.");
    await Promise.all([reload(), reloadMoteur()]);
  }

  const n = actives?.length ?? 0;
  const dispo = catalogue.filter((c) => !c.active);

  return (
    <>
      <DashboardHeader
        title="Compétences"
        description="Entre 1 et 5 compétences actives. Un changement s'applique aux missions générées à partir de demain, jamais à celles déjà créées."
      />

      <p className="mb-5 rounded-2xl border border-border bg-panel px-5 py-3 text-sm text-muted-foreground">
        Aujourd&apos;hui reste tel quel. Les missions nouvelles suivront tes compétences à partir de demain.
      </p>

      {!actives ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">ACTIVES</h2>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {n} / {max}
              </p>
            </div>
            <ul className="mt-4 space-y-5">
              {actives.map((c) => (
                <li key={c.id} className="border-b border-border pb-5 last:border-b-0 last:pb-0" data-competence={c.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm">{c.nom}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.domaineLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        niv. {c.niveau} · {c.palier}/{PALIERS_PAR_NIVEAU}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy === c.id || n <= min}
                        onClick={() => void retirer(c.id)}
                        className="h-9"
                      >
                        Retirer
                      </Button>
                    </div>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Palier ${c.palier} sur ${PALIERS_PAR_NIVEAU}`}
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.palier / PALIERS_PAR_NIVEAU) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Zones : {c.zones.map((z) => z.nom).join(", ") || "toutes"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">CATALOGUE</h2>
            {dispo.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Toutes les compétences du catalogue sont actives.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {dispo.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">{c.nom}</p>
                      <p className="text-xs text-muted-foreground">{c.domaineLabel}</p>
                    </div>
                    <Button
                      type="button"
                      disabled={busy === c.id || n >= max}
                      onClick={() => void ajouter(c.id)}
                      className={cn("h-9", n >= max && "opacity-50")}
                    >
                      Ajouter
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
