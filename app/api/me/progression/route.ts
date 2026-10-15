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
    supabase.from("missions").select("id, date_locale, type, statut, goal_id, payload").eq("user_id", user.id),
  ]);

  const snapshot = snapshotDepuisTables({
    ledger: ledger ?? [],
    goals: goals ?? [],
    missions: (missions ?? []).map((m) => ({
      id: m.id,
      date_locale: m.date_locale,
      type: m.type,
      statut: m.statut,
      goal_id: m.goal_id,
      reportee: Boolean((m.payload as { reportee?: boolean } | null)?.reportee),
    })),
    timezone: profile?.timezone ?? "Europe/Paris",
  });

  return NextResponse.json(snapshot);
}
