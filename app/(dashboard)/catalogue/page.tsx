import { CatalogueScreen, type OfficielExo } from "@/components/dashboard/catalogue-screen";
import { catalogueDe, type Cible, type ZoneCible } from "@/lib/catalogue/perso";
import { CATALOGUE } from "@/lib/moteur";
import { modeCompetence } from "@/lib/progression/contrat";
import { createClient } from "@/lib/supabase/server";

export default async function CataloguePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: choix }, { data: prefs }] = user
    ? await Promise.all([
        supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_skill_choices").select("competence_id, mode, mode_en_vigueur").eq("user_id", user.id),
        supabase.from("exercice_prefs").select("exercice_id, kind").eq("user_id", user.id),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const officielles: Cible[] = Object.values(CATALOGUE).map((c) => ({ id: c.id, nom: c.nom, perso: false }));
  const zonesOfficielles: ZoneCible[] = Object.values(CATALOGUE).flatMap((c) =>
    c.focus.map((f) => ({ id: f.id, nom: f.nom, competenceId: c.id, perso: false })),
  );
  const officiel: OfficielExo[] = Object.values(CATALOGUE).flatMap((c) =>
    c.exercices.map((e) => ({
      id: e.id,
      nom: e.nom,
      competenceId: c.id,
      competenceNom: c.nom,
      focusId: e.focusId,
      focusNom: c.focus.find((f) => f.id === e.focusId)?.nom ?? e.focusId,
    })),
  );
  const mixteIds = (choix ?? [])
    .filter((c) => modeCompetence(c.mode) === "mixte" || modeCompetence(c.mode_en_vigueur) === "mixte")
    .map((c) => c.competence_id);

  return (
    <CatalogueScreen
      perso={catalogueDe(data?.data)}
      officielles={officielles}
      zonesOfficielles={zonesOfficielles}
      officiel={officiel}
      mixteIds={mixteIds}
      prefs={(prefs ?? []).map((p) => ({ exerciceId: p.exercice_id, kind: p.kind as "epingle" | "masque" }))}
    />
  );
}
