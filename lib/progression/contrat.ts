import type { CataloguePerso, ChoixCompetence, Materiel, Profil } from "@/lib/moteur";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ContratPersiste = {
  materiel: Materiel[];
  budgetMinutesJour: number;
  joursDisponibles: number[];
  catalogPerso?: CataloguePerso;
};

export async function persistContrat(
  supabase: SupabaseClient,
  userId: string,
  profil: Pick<Profil, "choix" | "materiel" | "budgetMinutesJour" | "joursDisponibles" | "catalogPerso">,
) {
  const data: ContratPersiste = {
    materiel: profil.materiel,
    budgetMinutesJour: profil.budgetMinutesJour,
    joursDisponibles: profil.joursDisponibles ?? [0, 1, 2, 3, 4, 5, 6],
    catalogPerso: profil.catalogPerso,
  };

  const { error: catalogError } = await supabase.from("custom_catalog").upsert({
    user_id: userId,
    data,
  });
  if (catalogError) throw catalogError;

  const { data: existing, error: readError } = await supabase
    .from("user_skill_choices")
    .select("id, competence_id")
    .eq("user_id", userId);
  if (readError) throw readError;

  const nextIds = new Set(profil.choix.map((c) => c.competenceId));
  const toDelete = (existing ?? []).filter((row) => !nextIds.has(row.competence_id)).map((row) => row.id);
  if (toDelete.length) {
    const { error } = await supabase.from("user_skill_choices").delete().in("id", toDelete);
    if (error) throw error;
  }

  for (const choix of profil.choix) {
    const { error } = await supabase.from("user_skill_choices").upsert(
      {
        user_id: userId,
        competence_id: choix.competenceId,
        focus_ids: choix.focusIds,
        seances_semaine: choix.seancesParSemaine,
        minutes_max: choix.minutesMax,
        mode: "guide",
      },
      { onConflict: "user_id,competence_id" },
    );
    if (error) throw error;
  }
}

export function profilDepuisLignes(input: {
  userId: string;
  choix: {
    competence_id: string;
    focus_ids: string[] | null;
    seances_semaine: number | null;
    minutes_max: number | null;
  }[];
  catalog: ContratPersiste | null;
}): Profil {
  const data = input.catalog;
  return {
    userId: input.userId,
    choix: input.choix.map(
      (c): ChoixCompetence => ({
        competenceId: c.competence_id,
        focusIds: c.focus_ids ?? [],
        seancesParSemaine: c.seances_semaine ?? 3,
        minutesMax: c.minutes_max ?? 30,
      }),
    ),
    materiel: data?.materiel?.length ? data.materiel : ["aucun"],
    budgetMinutesJour: data?.budgetMinutesJour ?? 45,
    joursDisponibles: data?.joursDisponibles ?? [0, 1, 2, 3, 4, 5, 6],
    catalogPerso: data?.catalogPerso,
  };
}
