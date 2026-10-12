import { requireUser } from "@/lib/progression/auth-api";
import type { ContratPersiste } from "@/lib/progression/contrat";
import { etatDepuisProgression, ligneDepuisSeance, planDuJour } from "@/lib/progression/generer";
import { NextResponse } from "next/server";

export async function POST() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";

  const [{ data: choix }, { data: catalogRow }, { data: progress }, { data: passees }] = await Promise.all([
    supabase.from("user_skill_choices").select("competence_id, focus_ids, seances_semaine, minutes_max").eq("user_id", user.id),
    supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
    supabase.from("skill_progress").select("competence_id, focus_id, niveau, palier").eq("user_id", user.id),
    supabase
      .from("missions")
      .select("date_locale, competence_id, payload, statut")
      .eq("user_id", user.id)
      .eq("statut", "terminee")
      .order("date_locale", { ascending: true })
      .limit(80),
  ]);

  const etat = etatDepuisProgression({
    progress: progress ?? [],
    historique: (passees ?? []).map((m) => ({
      date: m.date_locale,
      competence_id: m.competence_id,
      payload: (m.payload ?? {}) as Record<string, unknown>,
    })),
    chaineJours: 0,
  });

  const plan = planDuJour({
    userId: user.id,
    timezone,
    choix: choix ?? [],
    catalog: (catalogRow?.data ?? null) as ContratPersiste | null,
    etat,
  });

  const { data: existantes, error: readError } = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date_locale", plan.date)
    .eq("type", "daily");

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  if (existantes && existantes.length > 0) {
    return NextResponse.json({ date: plan.date, created: false, missions: existantes });
  }

  const seances = plan.jour?.seances ?? [];
  if (seances.length === 0) {
    return NextResponse.json({ date: plan.date, created: false, missions: [] });
  }

  const lignes = seances.map((seance) => ligneDepuisSeance({ userId: user.id, seance }));
  const { data: inserted, error } = await supabase.from("missions").insert(lignes).select("*");

  if (error) {
    const { data: retry } = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date_locale", plan.date)
      .eq("type", "daily");
    if (retry && retry.length > 0) {
      return NextResponse.json({ date: plan.date, created: false, missions: retry });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ date: plan.date, created: true, missions: inserted ?? [] });
}
