import { requireUser, rpcErrorStatus } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const { data, error } = await supabase
    .from("exercice_prefs")
    .select("exercice_id, kind")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prefs: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const body = (await request.json().catch(() => null)) as { exerciceId?: string; kind?: string | null } | null;
  const exerciceId = body?.exerciceId?.trim() ?? "";
  if (!exerciceId) return NextResponse.json({ error: "exercice invalide" }, { status: 400 });

  if (body?.kind === null || body?.kind === "") {
    const { error } = await supabase.from("exercice_prefs").delete().eq("user_id", user.id).eq("exercice_id", exerciceId);
    if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
    return NextResponse.json({ ok: true });
  }

  const kind = body?.kind;
  if (kind !== "epingle" && kind !== "masque") {
    return NextResponse.json({ error: "préférence invalide" }, { status: 400 });
  }

  const { error } = await supabase.from("exercice_prefs").upsert(
    { user_id: user.id, exercice_id: exerciceId, kind },
    { onConflict: "user_id,exercice_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: rpcErrorStatus(error.message) });
  return NextResponse.json({ ok: true, exerciceId, kind });
}
