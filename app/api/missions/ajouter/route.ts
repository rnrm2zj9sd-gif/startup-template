import { catalogueDe } from "@/lib/catalogue/perso";
import { CATALOGUE } from "@/lib/moteur";
import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { modeCompetence, type ContratPersiste } from "@/lib/progression/contrat";
import { calculerXpMission } from "@/lib/progression/xp";
import { domaineAfficheDe, difficulteDepuisNiveau } from "@/lib/progression/generer";
import { jourLocal } from "@/lib/temps";
import { decalerJour } from "@/lib/progression/snapshot";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  await supabase.rpc("appliquer_modes_du_jour");
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";
  const aujourdHui = jourLocal(new Date(), timezone);
  const demain = decalerJour(aujourdHui, 1);

  const [{ data: choix }, { data: catalogRow }] = await Promise.all([
    supabase.from("user_skill_choices").select("competence_id, mode_en_vigueur").eq("user_id", user.id),
    supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
  ]);
  const libres = new Set(
    (choix ?? []).filter((c) => modeCompetence(c.mode_en_vigueur) === "libre").map((c) => c.competence_id),
  );
  const perso = catalogueDe(catalogRow?.data);
  const exercices = [
    ...Object.values(CATALOGUE).flatMap((c) =>
      !libres.has(c.id)
        ? []
        : c.exercices.map((e) => ({
            id: e.id,
            nom: e.nom,
            competenceId: c.id,
            competenceNom: c.nom,
            focusId: e.focusId,
            focusNom: c.focus.find((f) => f.id === e.focusId)?.nom ?? e.focusId,
            dureeMin: 2,
            dureeMax: 60,
            perso: false,
          })),
    ),
    ...perso.exercices
      .filter((e) => libres.has(e.competenceId))
      .map((e) => ({
        id: e.id,
        nom: e.nom,
        competenceId: e.competenceId,
        competenceNom: CATALOGUE[e.competenceId]?.nom ?? perso.competences.find((c) => c.id === e.competenceId)?.nom ?? e.competenceId,
        focusId: e.focusId,
        focusNom: perso.focus.find((f) => f.id === e.focusId)?.nom ?? e.focusId,
        dureeMin: e.mesure === "minutes" ? Math.max(2, e.valeur) : 2,
        dureeMax: e.mesure === "minutes" ? Math.max(2, Math.min(30, e.valeur)) : Math.max(2, Math.min(30, e.valeur)),
        perso: true,
      })),
  ];
  return NextResponse.json({ aujourdHui, demain, exercices });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => null)) as {
    exerciceId?: string;
    duree?: number;
    date?: string;
  } | null;
  const exerciceId = body?.exerciceId?.trim() ?? "";
  const duree = Number(body?.duree);
  const dateDemandee = String(body?.date ?? "").trim();
  if (!exerciceId) return NextResponse.json({ error: "exercice invalide" }, { status: 400 });
  if (!Number.isInteger(duree)) return NextResponse.json({ error: "durée invalide" }, { status: 400 });

  await supabase.rpc("appliquer_modes_du_jour");
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";
  const aujourdHui = jourLocal(new Date(), timezone);
  const demain = decalerJour(aujourdHui, 1);
  if (dateDemandee !== aujourdHui && dateDemandee !== demain) {
    return NextResponse.json({ error: "date invalide : aujourd'hui ou demain" }, { status: 400 });
  }

  const [{ data: catalogRow }, { data: choix }] = await Promise.all([
    supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_skill_choices").select("competence_id, mode_en_vigueur").eq("user_id", user.id),
  ]);
  const catalog = (catalogRow?.data ?? null) as ContratPersiste | null;
  const perso = catalogueDe(catalog);
  const officiel = Object.values(CATALOGUE).flatMap((c) => c.exercices.map((e) => ({ ...e, competenceId: c.id, competenceNom: c.nom, focusNom: c.focus.find((f) => f.id === e.focusId)?.nom ?? e.focusId })));
  const off = officiel.find((e) => e.id === exerciceId);
  const persoEx = perso.exercices.find((e) => e.id === exerciceId);

  if (!off && !persoEx) {
    return NextResponse.json({ error: "cet exercice ne t'appartient pas" }, { status: 403 });
  }

  const competenceId = off?.competenceId ?? persoEx!.competenceId;
  const libre = (choix ?? []).some((c) => c.competence_id === competenceId && modeCompetence(c.mode_en_vigueur) === "libre");
  if (!libre) {
    return NextResponse.json({ error: "mode invalide : compétence pas en libre" }, { status: 400 });
  }

  let min = 2;
  let max = 60;
  let difficulte: "facile" | "moyen" | "difficile" = "moyen";
  let nom = "";
  let focusId = "";
  let focusNom = "";
  let competenceNom = "";
  const estPerso = Boolean(persoEx) && !off;
  if (off) {
    min = Math.min(...(off.dosage.type === "action" ? [off.dosage.base, 2] : [2]));
    max = 60;
    const { data: borne } = await supabase
      .from("catalogue_officiel")
      .select("duree_min, duree_max, difficulte")
      .eq("exercice_id", exerciceId)
      .maybeSingle();
    if (borne) {
      min = borne.duree_min;
      max = borne.duree_max;
      difficulte = borne.difficulte as typeof difficulte;
    } else {
      difficulte = difficulteDepuisNiveau(off.niveau);
    }
    nom = off.nom;
    focusId = off.focusId;
    focusNom = off.focusNom;
    competenceNom = off.competenceNom;
  } else if (persoEx) {
    min = 2;
    max = Math.max(2, Math.min(30, persoEx.valeur));
    if (persoEx.mesure === "minutes") {
      min = Math.max(2, persoEx.valeur);
      max = Math.max(2, Math.min(30, persoEx.valeur));
    }
    difficulte = persoEx.difficulte;
    nom = persoEx.nom;
    focusId = persoEx.focusId;
    focusNom = perso.focus.find((f) => f.id === persoEx.focusId)?.nom ?? persoEx.focusId;
    competenceNom = CATALOGUE[competenceId]?.nom ?? perso.competences.find((c) => c.id === competenceId)?.nom ?? competenceId;
  }

  if (duree < min || duree > max) {
    return NextResponse.json({ error: "durée invalide : hors plage de l'exercice" }, { status: 400 });
  }

  const { count } = await supabase
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date_locale", dateDemandee)
    .neq("statut", "annulee")
    .contains("payload", { exerciceId });
  if ((count ?? 0) >= 2) {
    return NextResponse.json({ error: "limite atteinte : 2 fois le même exercice par jour" }, { status: 409 });
  }

  const prevue = dateDemandee === demain;
  const xp = calculerXpMission(
    { dureeMin: duree, difficulte, prevue, perso: estPerso },
    { chaineJours: 0 },
  );

  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: user.id,
      date_locale: dateDemandee,
      type: "daily",
      domaine: domaineAfficheDe(competenceId, catalog),
      competence_id: competenceId,
      titre: `${competenceNom} : ${nom}`,
      description: off?.consigne ?? persoEx?.consigne ?? `Fais « ${nom} ».`,
      duree_min: duree,
      difficulte,
      payload: {
        source: "libre",
        exerciceId,
        exerciceIds: [exerciceId],
        focusIds: [focusId],
        perso: estPerso,
        prevue,
      },
      xp_prevu: xp,
      statut: "a_faire",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ mission: data, prevue, focusNom });
}
