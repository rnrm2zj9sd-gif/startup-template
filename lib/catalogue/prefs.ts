import { catalogueVide } from "@/lib/moteur";
import type { ContratPersiste } from "@/lib/progression/contrat";

export type PrefKind = "epingle" | "masque";

export type ExercicePref = {
  exercice_id: string;
  kind: PrefKind;
};

export function catalogAvecPrefs(
  catalog: ContratPersiste | null,
  prefs: ExercicePref[],
): ContratPersiste {
  const perso = catalog?.catalogPerso ?? catalogueVide();
  const epingles = prefs.filter((p) => p.kind === "epingle").map((p) => p.exercice_id);
  const masques = prefs.filter((p) => p.kind === "masque").map((p) => p.exercice_id);
  return {
    materiel: catalog?.materiel?.length ? catalog.materiel : ["aucun"],
    budgetMinutesJour: catalog?.budgetMinutesJour ?? 45,
    joursDisponibles: catalog?.joursDisponibles ?? [0, 1, 2, 3, 4, 5, 6],
    catalogPerso: {
      ...perso,
      epingles: [...new Set([...perso.epingles, ...epingles])],
      masques: [...new Set([...perso.masques, ...masques])],
    },
  };
}
