import { requireUser } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

/** Les 10 dernières lignes du System Log du joueur (RLS : ses lignes seulement). */
export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await supabase
    .from("system_log")
    .select("id, type, payload, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lignes: data ?? [] });
}
