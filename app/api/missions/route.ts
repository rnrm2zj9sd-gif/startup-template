import { calculerXpMission, appliquerPlafondQuotidien } from "@/lib/progression/xp";
import { DOMAINE_AFFICHE, PERSO_MINUTES_MAX, type DomaineAffiche } from "@/lib/progression/config";
import { requireUser } from "@/lib/progression/auth-api";
import { jourLocal } from "@/lib/temps";
import { NextResponse } from "next/server";

const DIFFICULTES = new Set(["facile", "moyen", "difficile"]);

export async function GET(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase.from("missions").select("*").eq("user_id", user.id).order("date_locale", { ascending: true });
  if (from) query = query.gte("date_locale", from);
  if (to) query = query.lte("date_locale", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ missions: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as {
    titre?: string;
    description?: string;
    dureeMin?: number;
    difficulte?: string;
    domaine?: string;
    goalId?: string | null;
  };

  const titre = (body.titre ?? "").trim();
  if (titre.length < 3 || titre.length > 80) {
    return NextResponse.json({ error: "Le titre doit faire entre 3 et 80 caractères." }, { status: 400 });
  }

  const dureeMin = Math.round(Number(body.dureeMin));
  if (!Number.isFinite(dureeMin) || dureeMin < 5 || dureeMin > PERSO_MINUTES_MAX) {
    return NextResponse.json({ error: `Durée entre 5 et ${PERSO_MINUTES_MAX} min.` }, { status: 400 });
  }

  const difficulte = body.difficulte ?? "moyen";
  if (!DIFFICULTES.has(difficulte)) {
    return NextResponse.json({ error: "Difficulté invalide." }, { status: 400 });
  }

  const domaine = body.domaine as DomaineAffiche | undefined;
  if (!domaine || !DOMAINE_AFFICHE.includes(domaine)) {
    return NextResponse.json({ error: "Domaine invalide." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profile?.timezone || "Europe/Paris";
  const date = jourLocal(new Date(), timezone);

  const { data: ledger } = await supabase.from("xp_ledger").select("montant, raison, created_at").eq("user_id", user.id);

  const duJour = (ledger ?? []).filter((row) => jourLocal(new Date(row.created_at), timezone) === date);
  const xpDeja = duJour.reduce((a, r) => a + r.montant, 0);
  const xpPersoDeja = duJour.filter((r) => r.raison === "mission_perso").reduce((a, r) => a + r.montant, 0);

  const brut = calculerXpMission({ dureeMin, difficulte, prevue: false, perso: true }, { chaineJours: 0 });
  const { xp } = appliquerPlafondQuotidien({
    xpBrut: brut,
    xpDejaDuJour: xpDeja,
    xpPersoDejaDuJour: xpPersoDeja,
    estPerso: true,
  });

  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: user.id,
      date_locale: date,
      type: "side",
      domaine,
      competence_id: "perso",
      titre,
      description: (body.description ?? "").trim(),
      duree_min: dureeMin,
      difficulte,
      payload: { source: "manuel", prevue: false, perso: true, focusIds: [] },
      xp_prevu: xp,
      statut: "a_faire",
      goal_id: body.goalId ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mission: data }, { status: 201 });
}
