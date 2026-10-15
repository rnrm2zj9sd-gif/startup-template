import { CATALOGUE } from "@/lib/moteur";
import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { domaineAfficheDe } from "@/lib/progression/generer";
import { DOMAINE_LABELS } from "@/lib/progression/config";
import { NextResponse } from "next/server";

const MAX = 5;
const MIN = 1;

type ProgressRow = { competence_id: string; focus_id: string; niveau: number; palier: number };

function resumeProgression(progress: ProgressRow[], competenceId: string, focusIds: string[]) {
  const rows = progress.filter((p) => p.competence_id === competenceId && (focusIds.length === 0 || focusIds.includes(p.focus_id)));
  let niveau = 1;
  let palier = 0;
  for (const r of rows) {
    if (r.niveau > niveau || (r.niveau === niveau && r.palier > palier)) {
      niveau = r.niveau;
      palier = r.palier;
    }
  }
  return { niveau, palier };
}

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const [{ data: choix, error: e1 }, { data: progress, error: e2 }] = await Promise.all([
    supabase.from("user_skill_choices").select("competence_id, focus_ids").eq("user_id", user.id).order("competence_id"),
    supabase.from("skill_progress").select("competence_id, focus_id, niveau, palier").eq("user_id", user.id),
  ]);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const prog = (progress ?? []) as ProgressRow[];
  const actives = (choix ?? []).map((c) => {
    const competence = CATALOGUE[c.competence_id];
    const domaine = domaineAfficheDe(c.competence_id);
    const focusChoisis = c.focus_ids?.length ? c.focus_ids : (competence?.focus.map((f) => f.id) ?? []);
    const zones = focusChoisis.map((id) => {
      const src = competence?.focus.find((f) => f.id === id);
      const p = prog.find((r) => r.competence_id === c.competence_id && r.focus_id === id);
      return { id, nom: src?.nom ?? id, niveau: p?.niveau ?? 1, palier: p?.palier ?? 0 };
    });
    const { niveau, palier } = resumeProgression(prog, c.competence_id, focusChoisis);
    return {
      id: c.competence_id,
      nom: competence?.nom ?? c.competence_id,
      domaine,
      domaineLabel: DOMAINE_LABELS[domaine],
      niveau,
      palier,
      zones,
    };
  });

  const prises = new Set(actives.map((a) => a.id));
  const catalogue = Object.values(CATALOGUE).map((c) => ({
    id: c.id,
    nom: c.nom,
    domaine: domaineAfficheDe(c.id),
    domaineLabel: DOMAINE_LABELS[domaineAfficheDe(c.id)],
    active: prises.has(c.id),
  }));

  return NextResponse.json({ actives, catalogue, min: MIN, max: MAX });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => null)) as { competenceId?: string; focusIds?: string[] } | null;
  const competenceId = body?.competenceId?.trim() ?? "";
  const competence = CATALOGUE[competenceId];
  if (!competence) return NextResponse.json({ error: "compétence inconnue" }, { status: 400 });

  const { count } = await supabase
    .from("user_skill_choices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { data: deja } = await supabase
    .from("user_skill_choices")
    .select("id")
    .eq("user_id", user.id)
    .eq("competence_id", competenceId)
    .maybeSingle();
  if (!deja && (count ?? 0) >= MAX) {
    return NextResponse.json({ error: "limite atteinte : 5 compétences actives" }, { status: 409 });
  }

  const focusIds = body?.focusIds?.length ? body.focusIds : competence.focus.map((f) => f.id);
  const { error } = await supabase.from("user_skill_choices").upsert(
    {
      user_id: user.id,
      competence_id: competenceId,
      focus_ids: focusIds,
      seances_semaine: 3,
      minutes_max: 20,
      mode: "guide",
    },
    { onConflict: "user_id,competence_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ ok: true, competenceId });
}

export async function DELETE(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => null)) as { competenceId?: string } | null;
  const competenceId = body?.competenceId?.trim() ?? "";
  if (!competenceId) return NextResponse.json({ error: "compétence inconnue" }, { status: 400 });

  const { count } = await supabase
    .from("user_skill_choices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) <= MIN) {
    return NextResponse.json({ error: "il te faut au moins une compétence" }, { status: 409 });
  }

  const { error } = await supabase
    .from("user_skill_choices")
    .delete()
    .eq("user_id", user.id)
    .eq("competence_id", competenceId);
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ ok: true, competenceId });
}
