import type { CataloguePerso, CompetencePerso, DifficultePerso, Domaine, ExercicePerso, FocusPerso } from "@/lib/moteur";
import { DOMAINE_LABELS, type DomaineAffiche } from "@/lib/progression/config";
import type { ContratPersiste } from "@/lib/progression/contrat";

export const DOMAINES_PERSO: { id: DomaineAffiche; label: string; moteur: Domaine }[] = [
  { id: "finance", label: DOMAINE_LABELS.finance, moteur: "Finance" },
  { id: "mind", label: DOMAINE_LABELS.mind, moteur: "Mental" },
  { id: "health", label: DOMAINE_LABELS.health, moteur: "Santé" },
  { id: "fitness", label: DOMAINE_LABELS.fitness, moteur: "Physique" },
  { id: "discipline", label: DOMAINE_LABELS.discipline, moteur: "Discipline & Productivité" },
  { id: "life", label: DOMAINE_LABELS.life, moteur: "Vie personnelle" },
];

export const CATALOGUE_VIDE: CataloguePerso = {
  competences: [],
  focus: [],
  exercices: [],
  epingles: [],
  masques: [],
};

export function catalogueDe(data: unknown): CataloguePerso {
  const brut = (data as { catalogPerso?: Partial<CataloguePerso> } | null)?.catalogPerso;
  return {
    competences: brut?.competences ?? [],
    focus: brut?.focus ?? [],
    exercices: brut?.exercices ?? [],
    epingles: brut?.epingles ?? [],
    masques: brut?.masques ?? [],
  };
}

export function contratAvec(data: unknown, catalogPerso: CataloguePerso): ContratPersiste {
  const brut = (data ?? {}) as Partial<ContratPersiste>;
  return {
    materiel: brut.materiel?.length ? brut.materiel : ["aucun"],
    budgetMinutesJour: brut.budgetMinutesJour ?? 45,
    joursDisponibles: brut.joursDisponibles?.length ? brut.joursDisponibles : [0, 1, 2, 3, 4, 5, 6],
    catalogPerso,
  };
}

export function nouveauId(): string {
  return `perso-${crypto.randomUUID()}`;
}

export function domaineMoteur(id: string): Domaine | null {
  return DOMAINES_PERSO.find((d) => d.id === id)?.moteur ?? null;
}

export function labelDomaine(moteur: string): string {
  return DOMAINES_PERSO.find((d) => d.moteur === moteur)?.label ?? moteur;
}

const DIFFICULTES: DifficultePerso[] = ["facile", "moyen", "difficile"];

export function estDifficulte(v: string): v is DifficultePerso {
  return (DIFFICULTES as string[]).includes(v);
}

export function lienHttps(lien: string): string | null {
  const t = lien.trim();
  if (!t) return null;
  if (!/^https:\/\/\S+$/.test(t)) return null;
  return t;
}

export type Cible = { id: string; nom: string; perso: boolean };
export type ZoneCible = { id: string; nom: string; competenceId: string; perso: boolean };

export function ajouterCompetencePerso(perso: CataloguePerso, nom: string, domaine: Domaine): CataloguePerso {
  const competence: CompetencePerso = {
    id: nouveauId(),
    nom: nom.trim(),
    domaine,
    focusParSeance: 1,
    focus: [],
  };
  return { ...perso, competences: [...perso.competences, competence] };
}

export function ajouterZonePerso(perso: CataloguePerso, nom: string, competenceId: string): CataloguePerso {
  const zone: FocusPerso = {
    id: nouveauId(),
    competenceId,
    nom: nom.trim(),
    recuperationJours: 0,
  };
  return { ...perso, focus: [...perso.focus, zone] };
}

export function ajouterExercicePerso(
  perso: CataloguePerso,
  input: {
    nom: string;
    competenceId: string;
    focusId: string;
    consigne: string;
    valeur: number;
    difficulte: DifficultePerso;
    materiel?: ExercicePerso["materiel"];
    lien?: string;
  },
): CataloguePerso {
  const exercice: ExercicePerso = {
    id: nouveauId(),
    nom: input.nom.trim(),
    competenceId: input.competenceId,
    focusId: input.focusId,
    difficulte: input.difficulte,
    mesure: "minutes",
    valeur: input.valeur,
    consigne: input.consigne.trim(),
    materiel: input.materiel?.length ? input.materiel : ["aucun"],
    progression: false,
    ...(input.lien ? { lien: input.lien } : {}),
  };
  return { ...perso, exercices: [...perso.exercices, exercice] };
}
