import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

const RESSENTIS = new Set(["trop_facile", "bien", "trop_dur", "pas_fait"]);

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as {
    missionId?: string;
    ressenti?: string;
    note?: string;
    xp?: unknown;
  };

  const missionId = body.missionId;
  if (!missionId) {
    return NextResponse.json({ error: "missionId requis" }, { status: 400 });
  }

  const ressenti = body.ressenti && RESSENTIS.has(body.ressenti) ? body.ressenti : "bien";
  const note = typeof body.note === "string" ? body.note : "";
  // body.xp est ignoré volontairement : l'XP vient de la base.

  const { data, error } = await supabase.rpc("validate_mission", {
    p_mission_id: missionId,
    p_ressenti: ressenti,
    p_note: note,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  }

  return NextResponse.json(data);
}
