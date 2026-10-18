import { catalogAvecPrefs, type ExercicePref } from "@/lib/catalogue/prefs";
import { requireUser } from "@/lib/progression/auth-api";
import type { ContratPersiste } from "@/lib/progression/contrat";
import { etatDepuisProgression, ligneDepuisSeance, planDuJour } from "@/lib/progression/generer";
import { cibleMissionsDuJour, domainesChoisis, tirerMissionsDepart } from "@/lib/progression/missions-depart";
import { jourLocal } from "@/lib/temps";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Missions affichées pour `date` : celles du jour, plus la première victoire tant qu'elle n'est pas validée. */
async function missionsDuJour(supabase: SupabaseClient, userId: string, date: string) {
  const [{ data: duJour, error }, { data: premiere }] = await Promise.all([
    supabase.from("missions").select("*").eq("user_id", userId).eq("date_locale", date).in("type", ["daily", "first"]),
    supabase.from("missions").select("*").eq("user_id", userId).eq("type", "first").eq("statut", "a_faire"),
  ]);
  if (error) throw error;
  const parId = new Map([...(premiere ?? []), ...(duJour ?? [])].map((m) => [m.id, m]));
  return [...parId.values()].sort(
    (a, b) => Number(b.type === "first") - Number(a.type === "first") || a.created_at.localeCompare(b.created_at),
  );
}

function idsExercice(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const ids: string[] = [];
  if (typeof p.exerciceId === "string") ids.push(p.exerciceId);
  if (Array.isArray(p.exerciceIds)) ids.push(...p.exerciceIds.filter((id): id is string => typeof id === "string"));
  const seance = p.seance as { exercices?: { exerciceId?: string }[] } | undefined;
  if (Array.isArray(seance?.exercices)) {
    for (const e of seance.exercices) if (typeof e?.exerciceId === "string") ids.push(e.exerciceId);
  }
  return ids;
}

/** Génère les missions du jour une seule fois (daily_runs) ; recharger la page ne crée aucun doublon. */
export async function POST() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";
  const date = jourLocal(new Date(), timezone);

  const { data: run } = await supabase
    .from("daily_runs")
    .select("date_locale")
    .eq("user_id", user.id)
    .eq("date_locale", date)
    .maybeSingle();

  let created = false;
  if (!run) {
    await supabase.rpc("appliquer_modes_du_jour");
    const [{ data: choix }, { data: catalogRow }, { data: progress }, { data: passees }, { data: prefs }] = await Promise.all([
      supabase
        .from("user_skill_choices")
        .select("competence_id, focus_ids, seances_semaine, minutes_max, mode, mode_en_vigueur")
        .eq("user_id", user.id),
      supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
      supabase.from("skill_progress").select("competence_id, focus_id, niveau, palier").eq("user_id", user.id),
      supabase
        .from("missions")
        .select("date_locale, competence_id, payload, statut")
        .eq("user_id", user.id)
        .eq("statut", "terminee")
        .order("date_locale", { ascending: true })
        .limit(80),
      supabase.from("exercice_prefs").select("exercice_id, kind").eq("user_id", user.id),
    ]);

    if (choix?.length) {
      const etat = etatDepuisProgression({
        progress: progress ?? [],
        historique: (passees ?? []).map((m) => ({
          date: m.date_locale,
          competence_id: m.competence_id,
          payload: (m.payload ?? {}) as Record<string, unknown>,
        })),
        chaineJours: 0,
      });
      const catalog = catalogAvecPrefs((catalogRow?.data ?? null) as ContratPersiste | null, (prefs ?? []) as ExercicePref[]);
      const plan = planDuJour({
        userId: user.id,
        timezone,
        choix,
        catalog,
        etat,
      });

      const { data: dejaLa } = await supabase
        .from("missions")
        .select("competence_id, payload")
        .eq("user_id", user.id)
        .eq("date_locale", date)
        .eq("type", "daily");
      const prises = new Set((dejaLa ?? []).map((m) => m.competence_id));
      const domaines = domainesChoisis(
        choix.map((c) => c.competence_id),
        catalog,
      );
      const places = Math.max(0, cibleMissionsDuJour(domaines.length) - (dejaLa ?? []).length);
      const seances = (plan.jour?.seances ?? []).filter((s) => !prises.has(s.competenceId)).slice(0, places);
      const lignes = seances.map((seance) =>
        ligneDepuisSeance({
          userId: user.id,
          seance,
          catalog,
        }),
      );

      const exercicesExclus = [
        ...((dejaLa ?? []) as { payload: unknown }[]).flatMap((m) => idsExercice(m.payload)),
        ...seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)),
      ];
      lignes.push(
        ...tirerMissionsDepart({
          userId: user.id,
          date,
          domaines,
          deja: (dejaLa ?? []).length + lignes.length,
          exercicesExclus,
          chaineJours: etat.chaineJours,
        }),
      );

      if (lignes.length) {
        const { error } = await supabase.from("missions").insert(lignes);
        if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
        created = !error;
      }

      const { error: runError } = await supabase.from("daily_runs").insert({ user_id: user.id, date_locale: date });
      if (runError && runError.code !== "23505") {
        return NextResponse.json({ error: runError.message }, { status: 500 });
      }
    }
  }

  try {
    return NextResponse.json({ date, created, missions: await missionsDuJour(supabase, user.id, date) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
