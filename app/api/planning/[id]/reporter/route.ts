import { mapEvent } from "@/lib/planning/map-event";
import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const { data, error } = await supabase.rpc("reporter_evenement_calendrier", { p_event_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ event: mapEvent(data as Record<string, unknown>) });
}
