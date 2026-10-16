"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOMAINES_PERSO, labelDomaine, type Cible, type ZoneCible } from "@/lib/catalogue/perso";
import type { CataloguePerso, DifficultePerso, Materiel } from "@/lib/moteur";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const MATERIELS: { id: Materiel; label: string }[] = [
  { id: "aucun", label: "Aucun" },
  { id: "halteres", label: "Haltères" },
  { id: "barre_traction", label: "Barre de traction" },
  { id: "elastique", label: "Élastique" },
  { id: "banc", label: "Banc" },
  { id: "corde_a_sauter", label: "Corde à sauter" },
  { id: "papier_stylo", label: "Papier et stylo" },
  { id: "telephone", label: "Téléphone" },
];

const DIFFICULTES: { id: DifficultePerso; label: string }[] = [
  { id: "facile", label: "Facile" },
  { id: "moyen", label: "Moyen" },
  { id: "difficile", label: "Difficile" },
];

type Kind = "competence" | "zone" | "exercice";

export function CatalogueScreen({
  perso,
  officielles,
  zonesOfficielles,
}: {
  perso: CataloguePerso;
  officielles: Cible[];
  zonesOfficielles: ZoneCible[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [kind, setKind] = useState<Kind>("exercice");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState(DOMAINES_PERSO[0].id);
  const [competenceId, setCompetenceId] = useState("");
  const [focusId, setFocusId] = useState("");
  const [consigne, setConsigne] = useState("");
  const [duree, setDuree] = useState("10");
  const [difficulte, setDifficulte] = useState<DifficultePerso>("moyen");
  const [materiel, setMateriel] = useState<Materiel>("aucun");
  const [lien, setLien] = useState("");

  const competences = useMemo<Cible[]>(
    () => [...officielles, ...perso.competences.map((c) => ({ id: c.id, nom: c.nom, perso: true }))],
    [officielles, perso.competences],
  );
  const zones = useMemo<ZoneCible[]>(
    () => [
      ...zonesOfficielles,
      ...perso.focus.map((f) => ({ id: f.id, nom: f.nom, competenceId: f.competenceId, perso: true })),
    ],
    [zonesOfficielles, perso.focus],
  );
  const zonesFiltrees = zones.filter((z) => z.competenceId === competenceId);

  function reset(next: Kind) {
    setKind(next);
    setEditId(null);
    setNom("");
    setDomaine(DOMAINES_PERSO[0].id);
    setCompetenceId(competences.find((c) => c.perso)?.id ?? competences[0]?.id ?? "");
    setFocusId("");
    setConsigne("");
    setDuree("10");
    setDifficulte("moyen");
    setMateriel("aucun");
    setLien("");
    setOuvert(true);
  }

  function modifier(next: Kind, id: string) {
    setKind(next);
    setEditId(id);
    setOuvert(true);
    if (next === "competence") {
      const c = perso.competences.find((x) => x.id === id);
      setNom(c?.nom ?? "");
      setDomaine(DOMAINES_PERSO.find((d) => d.moteur === c?.domaine)?.id ?? DOMAINES_PERSO[0].id);
    } else if (next === "zone") {
      const z = perso.focus.find((x) => x.id === id);
      setNom(z?.nom ?? "");
      setCompetenceId(z?.competenceId ?? "");
    } else {
      const e = perso.exercices.find((x) => x.id === id);
      setNom(e?.nom ?? "");
      setCompetenceId(e?.competenceId ?? "");
      setFocusId(e?.focusId ?? "");
      setConsigne(e?.consigne ?? "");
      setDuree(String(e?.valeur ?? 10));
      setDifficulte(e?.difficulte ?? "moyen");
      setMateriel(e?.materiel?.[0] ?? "aucun");
      setLien(e?.lien ?? "");
    }
  }

  async function envoyer() {
    setBusy(true);
    const body: Record<string, unknown> = { kind, nom, domaine, competenceId, focusId, consigne, duree: Number(duree), difficulte, materiel, lien };
    if (editId) body.id = editId;
    const res = await fetch("/api/me/catalogue", {
      method: editId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Enregistrement impossible.");
      return;
    }
    toast.success(editId ? "Modifié." : "Créé.");
    setOuvert(false);
    router.refresh();
  }

  async function supprimer(next: Kind, id: string) {
    setBusy(true);
    const res = await fetch("/api/me/catalogue", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: next, id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Suppression impossible.");
      return;
    }
    toast.success("Supprimé. Tes missions passées restent.");
    router.refresh();
  }

  const vide = perso.competences.length + perso.focus.length + perso.exercices.length === 0;

  return (
    <>
      <DashboardHeader
        title="Mes exercices"
        description="Compétences, zones et exercices que tu ajoutes au catalogue. 30 éléments au total."
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-11" onClick={() => reset("competence")}>
          Créer une compétence
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => reset("zone")}>
          Créer une zone
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => reset("exercice")}>
          Créer un exercice
        </Button>
      </div>

      {ouvert && (
        <form
          className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer();
          }}
        >
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground">{editId ? "MODIFIER" : "CRÉER"}</p>
          <label className="block text-sm">
            Nom
            <Input className="mt-1 h-11 text-base" value={nom} maxLength={60} onChange={(e) => setNom(e.target.value)} required />
          </label>
          {kind === "competence" && (
            <label className="block text-sm">
              Domaine
              <select className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-base" value={domaine} onChange={(e) => setDomaine(e.target.value as typeof domaine)}>
                {DOMAINES_PERSO.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>
          )}
          {kind !== "competence" && (
            <label className="block text-sm">
              Compétence
              <select
                className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                value={competenceId}
                onChange={(e) => {
                  setCompetenceId(e.target.value);
                  setFocusId("");
                }}
              >
                <option value="">Choisir</option>
                {competences.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}{c.perso ? " (perso)" : ""}</option>
                ))}
              </select>
            </label>
          )}
          {kind === "exercice" && (
            <>
              <label className="block text-sm">
                Zone
                <select className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-base" value={focusId} onChange={(e) => setFocusId(e.target.value)} required>
                  <option value="">Choisir</option>
                  {zonesFiltrees.map((z) => (
                    <option key={z.id} value={z.id}>{z.nom}{z.perso ? " (perso)" : ""}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Consigne
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base"
                  maxLength={300}
                  value={consigne}
                  onChange={(e) => setConsigne(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Durée (min)
                  <Input className="mt-1 h-11 text-base" type="number" min={2} max={30} value={duree} onChange={(e) => setDuree(e.target.value)} required />
                </label>
                <label className="block text-sm">
                  Difficulté
                  <select className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-base" value={difficulte} onChange={(e) => setDifficulte(e.target.value as DifficultePerso)}>
                    {DIFFICULTES.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                Matériel
                <select className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-base" value={materiel} onChange={(e) => setMateriel(e.target.value as Materiel)}>
                  {MATERIELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Lien https
                <Input className="mt-1 h-11 text-base" inputMode="url" placeholder="https://" value={lien} onChange={(e) => setLien(e.target.value)} />
              </label>
            </>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="h-11" disabled={busy}>{editId ? "Enregistrer" : "Créer"}</Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setOuvert(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {vide ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Rien pour l’instant. Crée une compétence, une zone, puis un exercice.
        </p>
      ) : (
        <div className="space-y-5">
          <Section titre="COMPÉTENCES">
            {perso.competences.map((c) => (
              <Ligne key={c.id} titre={c.nom} detail={labelDomaine(c.domaine)} onEdit={() => modifier("competence", c.id)} onDelete={() => void supprimer("competence", c.id)} busy={busy} />
            ))}
          </Section>
          <Section titre="ZONES">
            {perso.focus.map((f) => (
              <Ligne key={f.id} titre={f.nom} detail={competences.find((c) => c.id === f.competenceId)?.nom ?? f.competenceId} onEdit={() => modifier("zone", f.id)} onDelete={() => void supprimer("zone", f.id)} busy={busy} />
            ))}
          </Section>
          <Section titre="EXERCICES">
            {perso.exercices.map((e) => (
              <li key={e.id} data-exercice={e.id} className="border-b border-border py-4 last:border-b-0">
                <p className="text-sm">{e.nom}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.valeur} min · {DIFFICULTES.find((d) => d.id === e.difficulte)?.label} · {zones.find((z) => z.id === e.focusId)?.nom ?? "zone"}
                </p>
                {e.consigne ? <p className="mt-2 text-sm text-muted-foreground">{e.consigne}</p> : null}
                {e.lien && e.lien.startsWith("https://") ? (
                  <a href={e.lien} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary">
                    {e.lien}
                  </a>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" className="h-11" onClick={() => modifier("exercice", e.id)}>Modifier</Button>
                  <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => void supprimer("exercice", e.id)}>Supprimer</Button>
                </div>
              </li>
            ))}
          </Section>
        </div>
      )}
    </>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[11px] tracking-[0.3em] text-muted-foreground">{titre}</h2>
      <ul className="mt-2">{children}</ul>
    </section>
  );
}

function Ligne({
  titre,
  detail,
  onEdit,
  onDelete,
  busy,
}: {
  titre: string;
  detail: string;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <li className="border-b border-border py-4 last:border-b-0">
      <p className="text-sm">{titre}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={onEdit}>Modifier</Button>
        <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onDelete}>Supprimer</Button>
      </div>
    </li>
  );
}
