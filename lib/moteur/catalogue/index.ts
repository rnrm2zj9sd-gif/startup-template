import { fusionnerCatalogue } from "../personnalisation";
import type { CataloguePerso, Competence } from "../types";
import { endurance, mobilite, musculation } from "./physique";
import {
  apprentissage,
  communication,
  educationFinanciere,
  hygieneDeVie,
  maitriseDeSoi,
  marketingVente,
  passageAction,
  quotidien,
} from "./autres-domaines";
import { cours } from "./cours";

const liste: Competence[] = [
  musculation,
  endurance,
  mobilite,
  educationFinanciere,
  cours,
  marketingVente,
  hygieneDeVie,
  maitriseDeSoi,
  passageAction,
  apprentissage,
  communication,
  quotidien,
];

export const CATALOGUE: Record<string, Competence> = Object.fromEntries(liste.map((c) => [c.id, c]));

export type MenuFocus = { id: string; nom: string; perso?: boolean };
export type MenuCompetence = { id: string; nom: string; perso?: boolean; focus: MenuFocus[] };

/** Pour l'écran « Choisis tes compétences » : domaine > compétences > zones. */
export function menuDeChoix(perso?: CataloguePerso): Record<string, MenuCompetence[]> {
  const parDomaine: Record<string, MenuCompetence[]> = {};
  for (const c of liste) {
    const extra = perso?.focus.filter((f) => f.competenceId === c.id) ?? [];
    (parDomaine[c.domaine] ??= []).push({
      id: c.id,
      nom: c.nom,
      focus: [
        ...c.focus.map(({ id, nom }) => ({ id, nom })),
        ...extra.map((f) => ({ id: f.id, nom: f.nom, perso: true })),
      ],
    });
  }
  for (const c of perso?.competences ?? []) {
    (parDomaine[c.domaine] ??= []).push({
      id: c.id,
      nom: c.nom,
      perso: true,
      focus: c.focus.map((f) => ({ id: f.id, nom: f.nom, perso: true })),
    });
  }
  return parDomaine;
}

function idsFocusPerso(c: Competence, perso?: CataloguePerso): Set<string> {
  const ids = new Set<string>();
  if (!perso) return ids;
  for (const f of perso.focus) if (f.competenceId === c.id) ids.add(f.id);
  const propre = perso.competences.find((x) => x.id === c.id);
  if (propre) for (const f of propre.focus) ids.add(f.id);
  return ids;
}

/** Vérifie la cohérence du catalogue (à lancer en CI). Une zone perso peut être vide. */
export function verifierCatalogue(perso?: CataloguePerso): string[] {
  const erreurs: string[] = [];
  const ids = new Set<string>();
  const competences = perso ? Object.values(fusionnerCatalogue(CATALOGUE, perso)) : liste;
  for (const c of competences) {
    const zonesPerso = idsFocusPerso(c, perso);
    for (const e of c.exercices) {
      if (ids.has(e.id)) erreurs.push(`id dupliqué : ${e.id}`);
      ids.add(e.id);
      if (!c.focus.some((f) => f.id === e.focusId)) erreurs.push(`${e.id} : focus inconnu ${e.focusId}`);
    }
    for (const f of c.focus) {
      if (zonesPerso.has(f.id)) continue; // zone perso : le moteur l'ignore tant qu'elle n'a pas d'exercice
      const sansMateriel = c.exercices.filter((e) => e.focusId === f.id && e.niveau === 1 && e.materiel.every((m) => m === "aucun" || m === "papier_stylo" || m === "telephone"));
      if (!sansMateriel.length) erreurs.push(`${c.id}/${f.id} : aucun exercice niveau 1 accessible à tous`);
    }
  }
  return erreurs;
}
