import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

/** Reporte une mission du jour à demain et pose `payload.reportee` (part 15 % de l'Indice de Discipline). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await supabase.rpc("reporter_mission", { p_mission_id: id });
  if (error) {
    const status = error.message.includes("compétence demain")
      ? 409
      : error.message.startsWith("seule une mission")
        ? 400
        : rpcErrorStatus(error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ mission: data });
}
