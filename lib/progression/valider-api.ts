import { NextResponse } from "next/server";
import { requireUser, rpcErrorStatus } from "./auth-api";

const RESSENTIS = new Set(["trop_facile", "bien", "trop_dur", "pas_fait"]);

/** POST de validation : l'XP vient de `validate_mission`, jamais du corps de la requête. */
export async function repondreValidation(missionId: string | undefined, request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  if (!missionId) {
    return NextResponse.json({ error: "missionId requis" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    ressenti?: string;
    note?: string;
  };

  const ressenti = body.ressenti && RESSENTIS.has(body.ressenti) ? body.ressenti : "bien";
  const note = typeof body.note === "string" ? body.note : "";

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
