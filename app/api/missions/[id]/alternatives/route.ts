import { catalogueDe } from "@/lib/catalogue/perso";
import { CATALOGUE } from "@/lib/moteur";
import { requireUser } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const { data: mission, error } = await supabase
    .from("missions")
    .select("id, user_id, competence_id, payload, statut, type")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!mission) return NextResponse.json({ error: "mission introuvable" }, { status: 404 });
  if (mission.user_id !== user.id) return NextResponse.json({ error: "cette mission ne t'appartient pas" }, { status: 403 });

  const payload = (mission.payload ?? {}) as Record<string, unknown>;
  const actuel = String(payload.exerciceId ?? (Array.isArray(payload.exerciceIds) ? payload.exerciceIds[0] : "") ?? "");
  const [{ data: catalogRow }, { data: prefs }] = await Promise.all([
    supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
    supabase.from("exercice_prefs").select("exercice_id, kind").eq("user_id", user.id),
  ]);
  const perso = catalogueDe(catalogRow?.data);
  const masques = new Set((prefs ?? []).filter((p) => p.kind === "masque").map((p) => p.exercice_id));

  const off = CATALOGUE[mission.competence_id]?.exercices.find((e) => e.id === actuel);
  const persoEx = perso.exercices.find((e) => e.id === actuel);
  const focusId = off?.focusId ?? persoEx?.focusId ?? (Array.isArray(payload.focusIds) ? String(payload.focusIds[0] ?? "") : "");

  const officiels = (CATALOGUE[mission.competence_id]?.exercices ?? [])
    .filter((e) => e.focusId === focusId && e.id !== actuel && !masques.has(e.id))
    .map((e) => ({ id: e.id, nom: e.nom, perso: false, focusId: e.focusId }));
  const persos = perso.exercices
    .filter((e) => e.competenceId === mission.competence_id && e.focusId === focusId && e.id !== actuel && !masques.has(e.id))
    .map((e) => ({ id: e.id, nom: e.nom, perso: true, focusId: e.focusId }));

  return NextResponse.json({ focusId, actuel, exercices: [...officiels, ...persos] });
}
