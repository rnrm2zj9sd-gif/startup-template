import { pairesQuiSeChevauchent } from "@/lib/planning/chevauchements";
import { mapEvent } from "@/lib/planning/map-event";
import { estDifficulte, estDomaine, estKind, minutesEntre, validerBrouillon, xpPotentielle } from "@/lib/planning/valider";
import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;

  const { data: actuel, error: readErr } = await supabase.from("calendar_events").select("*").eq("id", id).maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!actuel) return NextResponse.json({ error: "événement introuvable" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    titre?: string;
    description?: string;
    kind?: string;
    domaine?: string | null;
    difficulte?: string | null;
    startAt?: string;
    endAt?: string;
  } | null;

  if (actuel.statut === "terminee") {
    if (body?.kind !== undefined && body.kind !== actuel.kind) {
      return NextResponse.json({ error: "Une tâche terminée ne change plus de type." }, { status: 409 });
    }
    if (body?.difficulte !== undefined && body.difficulte !== actuel.difficulte) {
      return NextResponse.json({ error: "Une tâche terminée ne change plus de difficulté." }, { status: 409 });
    }
  }

  const kind = body?.kind !== undefined ? (estKind(body.kind) ? body.kind : null) : actuel.kind;
  if (!kind) return NextResponse.json({ error: "Type d'élément invalide." }, { status: 400 });
  const startAt = body?.startAt ? new Date(body.startAt) : new Date(actuel.start_at);
  const endAt = body?.endAt ? new Date(body.endAt) : new Date(actuel.end_at);
  const domaine =
    body?.domaine !== undefined ? (estDomaine(body.domaine) ? body.domaine : null) : actuel.domaine;
  const difficulte =
    body?.difficulte !== undefined ? (estDifficulte(body.difficulte) ? body.difficulte : null) : actuel.difficulte;

  const err = validerBrouillon({
    titre: body?.titre ?? actuel.titre,
    description: body?.description ?? actuel.description,
    kind,
    domaine,
    difficulte,
    startAt,
    endAt,
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const duree = minutesEntre(startAt, endAt);
  const patch = {
    titre: (body?.titre ?? actuel.titre).trim(),
    description: (body?.description ?? actuel.description ?? "").trim(),
    kind,
    domaine: kind === "productive" ? domaine : null,
    difficulte: kind === "productive" ? difficulte : null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    xp_prevu: xpPotentielle({ kind, dureeMin: duree, difficulte: kind === "productive" ? difficulte : null }),
  };

  const { data, error } = await supabase.from("calendar_events").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });

  const event = mapEvent(data as Record<string, unknown>);
  const { data: siblings } = await supabase
    .from("calendar_events")
    .select("id, start_at, end_at, statut")
    .eq("user_id", user.id)
    .neq("id", event.id)
    .neq("statut", "annulee");
  const overlaps = pairesQuiSeChevauchent([
    { id: event.id, start: Date.parse(event.start_at), end: Date.parse(event.end_at) },
    ...(siblings ?? []).map((s) => ({ id: s.id, start: Date.parse(s.start_at), end: Date.parse(s.end_at) })),
  ]).filter((p) => p.idA === event.id || p.idB === event.id);

  return NextResponse.json({ event, overlaps });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ ok: true });
}
