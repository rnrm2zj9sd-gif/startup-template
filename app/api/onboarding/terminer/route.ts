import { initiationDepuisChoix, premiereVictoire, profilDepuisOnboarding, validerOnboarding } from "@/lib/onboarding";
import { requireUser } from "@/lib/progression/auth-api";
import { persistContrat } from "@/lib/progression/contrat";
import { jourLocal } from "@/lib/temps";
import { NextResponse } from "next/server";

/** Enregistre les choix de l'onboarding et crée la mission de première victoire (une seule par joueur). */
export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const resultat = validerOnboarding(await request.json().catch(() => null));
  if (!resultat.ok) return NextResponse.json({ error: resultat.error }, { status: 400 });
  const choix = resultat.value;

  try {
    await persistContrat(supabase, user.id, profilDepuisOnboarding(user.id, choix));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const date = jourLocal(new Date(), profile?.timezone || "Europe/Paris");

  const lirePremiere = () =>
    supabase.from("missions").select("*").eq("user_id", user.id).eq("type", "first").maybeSingle();

  let { data: mission } = await lirePremiere();
  if (!mission) {
    const { data, error } = await supabase
      .from("missions")
      .insert({ user_id: user.id, date_locale: date, ...premiereVictoire(choix) })
      .select("*")
      .single();
    mission = data ?? (await lirePremiere()).data;
    if (!mission) return NextResponse.json({ error: error?.message ?? "Mission introuvable" }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      pseudo: choix.pseudo,
      gender: choix.gender,
      initiation: initiationDepuisChoix(choix),
      onboarding_done: true,
    })
    .eq("id", user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ mission });
}
