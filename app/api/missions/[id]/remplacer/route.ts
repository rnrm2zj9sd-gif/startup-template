import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => null)) as { exerciceId?: string } | null;
  const exerciceId = body?.exerciceId?.trim() ?? "";
  if (!exerciceId) return NextResponse.json({ error: "exercice invalide" }, { status: 400 });

  const { data, error } = await supabase.rpc("remplacer_mission", {
    p_mission_id: id,
    p_exercice_id: exerciceId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ mission: data });
}
