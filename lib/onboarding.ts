import { CATALOGUE, calculerXP, type Materiel, type Profil } from "@/lib/moteur";
import { MATERIEL_LABELS } from "@/lib/moteur/app";
import { domaineAfficheDe } from "@/lib/progression/generer";
import { parseGender, type Gender, type InitiationProfile } from "@/types/player";

export const COMPETENCES_MIN = 2;
export const COMPETENCES_MAX = 3;
export const PSEUDO_MAX = 24;
export const BUDGETS_MINUTES = [10, 15, 20, 30, 45, 60] as const;
export const MATERIELS = Object.keys(MATERIEL_LABELS) as Materiel[];
export const PREMIERE_MISSION_MINUTES = 2;
const SEANCES_PAR_SEMAINE = 5;

export type ChoixOnboarding = {
  pseudo: string;
  gender: Gender;
  competences: { id: string; focusIds: string[] }[];
  budgetMinutes: number;
  materiel: Materiel[];
};

type Resultat = { ok: true; value: ChoixOnboarding } | { ok: false; error: string };

/** Valide les choix envoyés par le client : seul le catalogue du moteur fait foi. */
export function validerOnboarding(input: unknown): Resultat {
  if (!input || typeof input !== "object") return { ok: false, error: "Choix manquants." };
  const v = input as Record<string, unknown>;

  const pseudo = typeof v.pseudo === "string" ? v.pseudo.trim() : "";
  if (!pseudo) return { ok: false, error: "Choisis un pseudo." };
  if (pseudo.length > PSEUDO_MAX) return { ok: false, error: `Pseudo : ${PSEUDO_MAX} caractères maximum.` };

  const gender = parseGender(v.gender);
  if (!gender) return { ok: false, error: "Choisis ton personnage." };

  const brutes = Array.isArray(v.competences) ? v.competences : [];
  const competences: ChoixOnboarding["competences"] = [];
  for (const c of brutes) {
    const id = typeof c?.id === "string" ? c.id : "";
    const competence = CATALOGUE[id];
    if (!competence) return { ok: false, error: "Compétence inconnue." };
    if (competences.some((x) => x.id === id)) continue;
    const zones = new Set(competence.focus.map((f) => f.id));
    const focusIds = Array.isArray(c.focusIds) ? c.focusIds.filter((f: unknown) => typeof f === "string") : [];
    if (focusIds.some((f: string) => !zones.has(f))) return { ok: false, error: `Zone inconnue pour ${competence.nom}.` };
    competences.push({ id, focusIds: [...new Set<string>(focusIds)] });
  }
  if (competences.length < COMPETENCES_MIN || competences.length > COMPETENCES_MAX) {
    return { ok: false, error: `Choisis ${COMPETENCES_MIN} ou ${COMPETENCES_MAX} compétences.` };
  }

  const budgetMinutes = Number(v.budgetMinutes);
  if (!(BUDGETS_MINUTES as readonly number[]).includes(budgetMinutes)) {
    return { ok: false, error: "Choisis ton temps par jour." };
  }

  const materielBrut = Array.isArray(v.materiel) ? v.materiel : [];
  if (materielBrut.some((m) => !MATERIELS.includes(m as Materiel))) return { ok: false, error: "Matériel inconnu." };
  const materiel = [...new Set<Materiel>(["aucun", ...(materielBrut as Materiel[])])];

  return { ok: true, value: { pseudo, gender, competences, budgetMinutes, materiel } };
}

export function initiationDepuisChoix(choix: ChoixOnboarding): InitiationProfile {
  return { competences: choix.competences, budgetMinutes: choix.budgetMinutes, materiel: choix.materiel };
}

/** Relit `profiles.initiation` (null si absent ou d'un ancien format). */
export function parseInitiationProfile(value: unknown): InitiationProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.competences) || typeof v.budgetMinutes !== "number") return undefined;
  const competences = v.competences
    .filter((c): c is { id: string; focusIds?: unknown } => typeof c?.id === "string")
    .map((c) => ({ id: c.id, focusIds: Array.isArray(c.focusIds) ? c.focusIds.filter((f) => typeof f === "string") : [] }));
  const materiel = Array.isArray(v.materiel) ? v.materiel.filter((m): m is string => typeof m === "string") : [];
  return { competences, budgetMinutes: v.budgetMinutes, materiel };
}

/** Contrat du moteur : le budget du jour est partagé entre les compétences choisies. */
export function profilDepuisOnboarding(userId: string, choix: ChoixOnboarding): Profil {
  return {
    userId,
    choix: choix.competences.map((c) => ({
      competenceId: c.id,
      focusIds: c.focusIds,
      seancesParSemaine: SEANCES_PAR_SEMAINE,
      minutesMax: Math.min(40, Math.max(5, choix.budgetMinutes)),
    })),
    materiel: choix.materiel,
    joursDisponibles: [0, 1, 2, 3, 4, 5, 6],
    budgetMinutesJour: choix.budgetMinutes,
  };
}

/** Mission plancher de 2 minutes sur la première compétence choisie. */
export function premiereVictoire(choix: Pick<ChoixOnboarding, "competences" | "materiel">) {
  const { id, focusIds } = choix.competences[0];
  const competence = CATALOGUE[id];
  const accessible = (m: Materiel[]) => m.every((x) => choix.materiel.includes(x) || x === "aucun");
  const exercice =
    competence.exercices.find(
      (e) => e.niveau === 1 && e.versionPlancher && accessible(e.materiel) && (!focusIds.length || focusIds.includes(e.focusId)),
    ) ?? competence.exercices.find((e) => e.niveau === 1 && accessible(e.materiel));
  const consigne = exercice?.versionPlancher ?? `2 minutes de « ${exercice?.nom ?? competence.nom} ».`;

  return {
    type: "first" as const,
    domaine: domaineAfficheDe(id),
    competence_id: id,
    titre: `Première victoire : ${competence.nom}`,
    description: consigne,
    duree_min: PREMIERE_MISSION_MINUTES,
    difficulte: "facile",
    payload: { source: "onboarding", prevue: true, perso: false, focusIds: [], niveauMoyen: 1 },
    xp_prevu: calculerXP(PREMIERE_MISSION_MINUTES, 1, 0),
    statut: "a_faire" as const,
  };
}
