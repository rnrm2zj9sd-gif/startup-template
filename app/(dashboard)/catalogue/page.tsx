import { CatalogueScreen } from "@/components/dashboard/catalogue-screen";
import { catalogueDe, type Cible, type ZoneCible } from "@/lib/catalogue/perso";
import { CATALOGUE } from "@/lib/moteur";
import { createClient } from "@/lib/supabase/server";

export default async function CataloguePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const officielles: Cible[] = Object.values(CATALOGUE).map((c) => ({ id: c.id, nom: c.nom, perso: false }));
  const zonesOfficielles: ZoneCible[] = Object.values(CATALOGUE).flatMap((c) =>
    c.focus.map((f) => ({ id: f.id, nom: f.nom, competenceId: c.id, perso: false })),
  );

  return <CatalogueScreen perso={catalogueDe(data?.data)} officielles={officielles} zonesOfficielles={zonesOfficielles} />;
}
