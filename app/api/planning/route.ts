import { pairesQuiSeChevauchent } from "@/lib/planning/chevauchements";
import { mapEvent } from "@/lib/planning/map-event";
import { estDifficulte, estDomaine, estKind, minutesEntre, validerBrouillon, xpPotentielle } from "@/lib/planning/valider";
import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { jourLocal } from "@/lib/temps";
import type { PlanningMission } from "@/lib/planning/types";
import { NextResponse } from "next/server";

function ymdOk(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function GET(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!ymdOk(from) || !ymdOk(to) || from > to) {
    return NextResponse.json({ error: "période invalide" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";

  const debut = `${from}T00:00:00.000Z`;
  const fin = `${to}T23:59:59.999Z`;

  const [{ data: evRows, error: evErr }, { data: misRows, error: misErr }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .lt("start_at", new Date(Date.parse(to + "T23:59:59Z") + 36 * 3600_000).toISOString())
      .gt("end_at", new Date(Date.parse(from + "T00:00:00Z") - 36 * 3600_000).toISOString())
      .order("start_at"),
    supabase
      .from("missions")
      .select("id, titre, description, date_locale, domaine, duree_min, difficulte, xp_prevu, statut, type, payload")
      .eq("user_id", user.id)
      .gte("date_locale", from)
      .lte("date_locale", to)
      .neq("statut", "annulee"),
  ]);
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });
  if (misErr) return NextResponse.json({ error: misErr.message }, { status: 500 });

  const events = (evRows ?? []).map((r) => mapEvent(r as Record<string, unknown>));
  const missionIds = (misRows ?? [])
    .filter((m) => (m.payload as { source?: string } | null)?.source !== "calendrier")
    .map((m) => m.id);
  const { data: led } = missionIds.length
    ? await supabase.from("xp_ledger").select("mission_id, montant").in("mission_id", missionIds)
    : { data: [] as { mission_id: string; montant: number }[] };
  const xpParMission = new Map<string, number>();
  for (const l of led ?? []) {
    xpParMission.set(l.mission_id, (xpParMission.get(l.mission_id) ?? 0) + Number(l.montant));
  }

  const missions: PlanningMission[] = (misRows ?? [])
    .filter((m) => (m.payload as { source?: string } | null)?.source !== "calendrier")
    .map((m) => ({
      id: m.id,
      titre: m.titre,
      description: m.description ?? "",
      date_locale: String(m.date_locale).slice(0, 10),
      domaine: m.domaine,
      duree_min: m.duree_min,
      difficulte: m.difficulte,
      xp_prevu: m.xp_prevu,
      xp_gagne: xpParMission.get(m.id) ?? 0,
      statut: m.statut,
      type: m.type,
    }));

  const overlaps = pairesQuiSeChevauchent(
    events.filter((e) => e.statut !== "annulee").map((e) => ({
      id: e.id,
      start: Date.parse(e.start_at),
      end: Date.parse(e.end_at),
    })),
  );

  return NextResponse.json({
    timezone,
    aujourdHui: jourLocal(new Date(), timezone),
    from,
    to,
    events,
    missions,
    overlaps,
    debut,
    fin,
  });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => null)) as {
    titre?: string;
    description?: string;
    kind?: string;
    domaine?: string | null;
    difficulte?: string | null;
    startAt?: string;
    endAt?: string;
  } | null;

  const kind = estKind(body?.kind) ? body.kind : null;
  const startAt = body?.startAt ? new Date(body.startAt) : new Date(NaN);
  const endAt = body?.endAt ? new Date(body.endAt) : new Date(NaN);
  const domaine = body?.domaine && estDomaine(body.domaine) ? body.domaine : null;
  const difficulte = body?.difficulte && estDifficulte(body.difficulte) ? body.difficulte : null;
  if (!kind) return NextResponse.json({ error: "Type d'élément invalide." }, { status: 400 });

  const err = validerBrouillon({
    titre: body?.titre ?? "",
    description: body?.description ?? "",
    kind,
    domaine,
    difficulte,
    startAt,
    endAt,
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const duree = minutesEntre(startAt, endAt);
  const xp_prevu = xpPotentielle({ kind, dureeMin: duree, difficulte });

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: user.id,
      titre: body!.titre!.trim(),
      description: (body?.description ?? "").trim(),
      kind,
      domaine: kind === "productive" ? domaine : null,
      difficulte: kind === "productive" ? difficulte : null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      xp_prevu,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  }

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
