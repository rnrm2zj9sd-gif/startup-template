import { requireUser } from "@/lib/progression/auth-api";
import { snapshotDepuisTables } from "@/lib/progression/snapshot";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const [{ data: profile }, { data: ledger }, { data: goals }, { data: missions }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase.from("xp_ledger").select("montant, domaine, created_at").eq("user_id", user.id),
    supabase.from("goals").select("id, statut").eq("user_id", user.id),
    supabase.from("missions").select("id, date_locale, type, statut, goal_id").eq("user_id", user.id),
  ]);

  const snapshot = snapshotDepuisTables({
    ledger: ledger ?? [],
    goals: goals ?? [],
    missions: missions ?? [],
    timezone: profile?.timezone ?? "Europe/Paris",
  });

  return NextResponse.json(snapshot);
}
