import { A, D, R } from "./catalogue/outils";
import type {
  CataloguePerso,
  Competence,
  CompetencePerso,
  Exercice,
  ExercicePerso,
  FocusPerso,
} from "./types";

export const catalogueVide = (): CataloguePerso => ({
  competences: [],
  focus: [],
  exercices: [],
  epingles: [],
  masques: [],
});

export function nouveauIdPerso(): string {
  return `perso-${crypto.randomUUID()}`;
}

function clonerCatalogue(officiel: Record<string, Competence>): Record<string, Competence> {
  return JSON.parse(JSON.stringify(officiel)) as Record<string, Competence>;
}

function zoneConnue(
  competenceId: string,
  focusId: string,
  officiel: Record<string, Competence>,
  perso: CataloguePerso,
): boolean {
  if (officiel[competenceId]?.focus.some((f) => f.id === focusId)) return true;
  if (perso.focus.some((f) => f.competenceId === competenceId && f.id === focusId)) return true;
  return perso.competences.some((c) => c.id === competenceId && c.focus.some((f) => f.id === focusId));
}

/** Bornes et présence d'une zone (officielle ou perso). */
export function validerExercicePerso(
  e: Partial<ExercicePerso>,
  officiel: Record<string, Competence> = {},
  perso: CataloguePerso = catalogueVide(),
): string[] {
  const erreurs: string[] = [];
  const nom = e.nom?.trim() ?? "";
  if (nom.length < 3 || nom.length > 60) erreurs.push("Le nom doit faire entre 3 et 60 caractères.");
  if (!e.competenceId) erreurs.push("La compétence est obligatoire.");
  if (!e.focusId) erreurs.push("La zone est obligatoire.");
  if (e.competenceId && e.focusId && !zoneConnue(e.competenceId, e.focusId, officiel, perso)) {
    erreurs.push(`La zone « ${e.focusId} » n'existe pas pour ${e.competenceId}.`);
  }
  if (e.consigne && e.consigne.length > 200) erreurs.push("La consigne dépasse 200 caractères.");
  if (e.series !== undefined && (e.series < 1 || e.series > 6)) erreurs.push("Les séries doivent être entre 1 et 6.");

  const valeur = e.valeur ?? 0;
  if (e.mesure === "repetitions") {
    if (valeur < 1 || valeur > 200) erreurs.push("Les répétitions doivent être entre 1 et 200.");
  } else if (e.mesure === "duree") {
    if (valeur < 5 || valeur > 600) erreurs.push("La durée doit être entre 5 et 600 secondes.");
  } else if (e.mesure === "minutes") {
    if (valeur < 1 || valeur > 60) erreurs.push("Les minutes doivent être entre 1 et 60.");
  } else {
    erreurs.push("La mesure doit être répétitions, durée ou minutes.");
  }
  return erreurs;
}

function incrementProgression(valeur: number): number {
  return Math.max(1, Math.round(valeur * 0.1));
}

export function exercicePersoVersExercice(e: ExercicePerso): Exercice {
  const niveau = ({ facile: 1, moyen: 2, difficile: 3 } as const)[e.difficulte];
  const inc = e.progression ? incrementProgression(e.valeur) : 0;
  const series = e.series ?? 3;
  const dosage =
    e.mesure === "repetitions"
      ? R(series, e.valeur, inc)
      : e.mesure === "duree"
        ? D(series, e.valeur, inc)
        : A(e.valeur, e.progression ? 1 : 0);
  return {
    id: e.id,
    nom: e.nom,
    focusId: e.focusId,
    niveau,
    materiel: e.materiel?.length ? e.materiel : ["aucun"],
    dosage,
    consigne: e.consigne?.trim() || `Fais « ${e.nom} » jusqu'au bout, puis coche.`,
    versionPlancher: e.versionPlancher,
    perso: true,
  };
}

export function fusionnerCatalogue(
  officiel: Record<string, Competence>,
  perso: CataloguePerso,
): Record<string, Competence> {
  const clone = clonerCatalogue(officiel);

  for (const c of perso.competences) {
    if (clone[c.id]) continue;
    clone[c.id] = {
      id: c.id,
      nom: c.nom,
      domaine: c.domaine,
      focusParSeance: c.focusParSeance,
      focus: c.focus.map((f) => ({ ...f })),
      exercices: [],
    };
  }

  for (const f of perso.focus) {
    const dest = clone[f.competenceId];
    if (!dest) continue;
    if (!dest.focus.some((x) => x.id === f.id)) {
      dest.focus.push({ id: f.id, nom: f.nom, recuperationJours: f.recuperationJours });
    }
  }

  const masques = new Set(perso.masques);
  const epingles = new Set(perso.epingles);

  for (const id of Object.keys(clone)) {
    clone[id].exercices = clone[id].exercices.filter((e) => !masques.has(e.id));
  }

  for (const e of perso.exercices) {
    if (masques.has(e.id)) continue;
    const dest = clone[e.competenceId];
    if (!dest) continue;
    if (dest.exercices.some((x) => x.id === e.id)) continue;
    dest.exercices.push(exercicePersoVersExercice(e));
  }

  for (const id of Object.keys(clone)) {
    for (const e of clone[id].exercices) {
      if (epingles.has(e.id)) e.epingle = true;
    }
  }

  return clone;
}

function lancerSiErreurs(erreurs: string[]): void {
  if (erreurs.length) throw new Error(erreurs.join(" "));
}

export function ajouterExercice(
  perso: CataloguePerso,
  brut: Omit<ExercicePerso, "id"> & { id?: string },
  officiel: Record<string, Competence> = {},
): CataloguePerso {
  const exercice: ExercicePerso = { ...brut, id: brut.id ?? nouveauIdPerso() };
  lancerSiErreurs(validerExercicePerso(exercice, officiel, perso));
  return { ...perso, exercices: [...perso.exercices, exercice] };
}

export function modifierExercice(
  perso: CataloguePerso,
  id: string,
  patch: Partial<ExercicePerso>,
  officiel: Record<string, Competence> = {},
): CataloguePerso {
  const actuel = perso.exercices.find((e) => e.id === id);
  if (!actuel) throw new Error(`Exercice perso introuvable : ${id}`);
  const suivant = { ...actuel, ...patch, id };
  lancerSiErreurs(validerExercicePerso(suivant, officiel, perso));
  return { ...perso, exercices: perso.exercices.map((e) => (e.id === id ? suivant : e)) };
}

export function supprimerExercice(perso: CataloguePerso, id: string): CataloguePerso {
  if (!perso.exercices.some((e) => e.id === id)) throw new Error(`Exercice perso introuvable : ${id}`);
  return {
    ...perso,
    exercices: perso.exercices.filter((e) => e.id !== id),
    epingles: perso.epingles.filter((x) => x !== id),
    masques: perso.masques.filter((x) => x !== id),
  };
}

export function ajouterFocus(
  perso: CataloguePerso,
  focus: Omit<FocusPerso, "id"> & { id?: string },
  officiel: Record<string, Competence> = {},
): CataloguePerso {
  const nom = focus.nom?.trim() ?? "";
  if (nom.length < 2) throw new Error("Le nom de la zone est trop court.");
  if (!focus.competenceId) throw new Error("La compétence de la zone est obligatoire.");
  if (!officiel[focus.competenceId] && !perso.competences.some((c) => c.id === focus.competenceId)) {
    throw new Error(`Compétence inconnue : ${focus.competenceId}`);
  }
  const id = focus.id ?? nouveauIdPerso();
  return {
    ...perso,
    focus: [...perso.focus, { id, competenceId: focus.competenceId, nom, recuperationJours: focus.recuperationJours }],
  };
}

export function ajouterCompetence(
  perso: CataloguePerso,
  brut: Omit<CompetencePerso, "id"> & { id?: string },
): CataloguePerso {
  const nom = brut.nom?.trim() ?? "";
  if (nom.length < 2) throw new Error("Le nom de la compétence est trop court.");
  if (!brut.focus?.length) throw new Error("Une compétence perso doit avoir au moins une zone.");
  const id = brut.id ?? nouveauIdPerso();
  const competence: CompetencePerso = {
    ...brut,
    id,
    nom,
    focus: brut.focus.map((f) => ({ ...f, id: f.id || nouveauIdPerso() })),
  };
  return { ...perso, competences: [...perso.competences, competence] };
}

export function supprimerCompetence(perso: CataloguePerso, id: string): CataloguePerso {
  if (!perso.competences.some((c) => c.id === id)) throw new Error(`Compétence perso introuvable : ${id}`);
  const exercicesRestants = perso.exercices.filter((e) => e.competenceId !== id);
  const idsSupprimes = new Set(perso.exercices.filter((e) => e.competenceId === id).map((e) => e.id));
  return {
    competences: perso.competences.filter((c) => c.id !== id),
    focus: perso.focus.filter((f) => f.competenceId !== id),
    exercices: exercicesRestants,
    epingles: perso.epingles.filter((x) => !idsSupprimes.has(x)),
    masques: perso.masques.filter((x) => !idsSupprimes.has(x)),
  };
}

export function epingler(perso: CataloguePerso, exerciceId: string): CataloguePerso {
  if (!exerciceId) throw new Error("L'identifiant de l'exercice est obligatoire.");
  if (perso.epingles.includes(exerciceId)) return perso;
  return { ...perso, epingles: [...perso.epingles, exerciceId], masques: perso.masques.filter((x) => x !== exerciceId) };
}

export function desepingler(perso: CataloguePerso, exerciceId: string): CataloguePerso {
  return { ...perso, epingles: perso.epingles.filter((x) => x !== exerciceId) };
}

export function masquer(perso: CataloguePerso, exerciceId: string): CataloguePerso {
  if (!exerciceId) throw new Error("L'identifiant de l'exercice est obligatoire.");
  if (perso.masques.includes(exerciceId)) return perso;
  return { ...perso, masques: [...perso.masques, exerciceId], epingles: perso.epingles.filter((x) => x !== exerciceId) };
}

export function afficher(perso: CataloguePerso, exerciceId: string): CataloguePerso {
  return { ...perso, masques: perso.masques.filter((x) => x !== exerciceId) };
}
