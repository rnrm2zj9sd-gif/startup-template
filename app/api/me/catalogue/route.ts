import { CATALOGUE, type Materiel } from "@/lib/moteur";
import {
  ajouterCompetencePerso,
  ajouterExercicePerso,
  ajouterZonePerso,
  catalogueDe,
  contratAvec,
  domaineMoteur,
  estDifficulte,
  lienHttps,
} from "@/lib/catalogue/perso";
import { requireUser } from "@/lib/progression/auth-api";
import type { CataloguePerso } from "@/lib/moteur";
import { NextResponse } from "next/server";

const MATERIELS: Materiel[] = [
  "aucun",
  "halteres",
  "barre_traction",
  "elastique",
  "banc",
  "corde_a_sauter",
  "papier_stylo",
  "telephone",
];

function erreurSql(message: string) {
  const status = message.includes("limite atteinte") ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

async function enregistrer(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  suivant: CataloguePerso,
) {
  const { data: row } = await supabase.from("custom_catalog").select("data").eq("user_id", userId).maybeSingle();
  const { error } = await supabase.from("custom_catalog").upsert({
    user_id: userId,
    data: contratAvec(row?.data, suivant),
  });
  if (error) return erreurSql(error.message);
  return NextResponse.json({ ok: true });
}

function competenceConnue(perso: CataloguePerso, id: string) {
  return Boolean(CATALOGUE[id] || perso.competences.some((c) => c.id === id));
}

function zoneConnue(perso: CataloguePerso, competenceId: string, focusId: string) {
  if (CATALOGUE[competenceId]?.focus.some((f) => f.id === focusId)) return true;
  return perso.focus.some((f) => f.id === focusId && f.competenceId === competenceId);
}

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const { data, error } = await supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(catalogueDe(data?.data));
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "requête invalide" }, { status: 400 });

  const { data } = await supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle();
  const perso = catalogueDe(data?.data);
  const kind = String(body.kind ?? "");
  const nom = String(body.nom ?? "").trim();

  if (kind === "competence") {
    const domaine = domaineMoteur(String(body.domaine ?? ""));
    if (!nom || nom.length > 60) return NextResponse.json({ error: "nom invalide : 60 caractères maximum" }, { status: 400 });
    if (!domaine) return NextResponse.json({ error: "domaine invalide" }, { status: 400 });
    return enregistrer(supabase, user.id, ajouterCompetencePerso(perso, nom, domaine));
  }

  if (kind === "zone") {
    const competenceId = String(body.competenceId ?? "");
    if (!nom || nom.length > 60) return NextResponse.json({ error: "nom invalide : 60 caractères maximum" }, { status: 400 });
    if (!competenceConnue(perso, competenceId)) return NextResponse.json({ error: "compétence inconnue" }, { status: 400 });
    return enregistrer(supabase, user.id, ajouterZonePerso(perso, nom, competenceId));
  }

  if (kind === "exercice") {
    const construit = lireExercice(body, perso);
    if (construit instanceof NextResponse) return construit;
    return enregistrer(supabase, user.id, ajouterExercicePerso(perso, construit));
  }

  return NextResponse.json({ error: "type invalide" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  const { data } = await supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle();
  const perso = catalogueDe(data?.data);
  const id = String(body.id ?? "");
  const nom = String(body.nom ?? "").trim();
  const kind = String(body.kind ?? "");

  if (kind === "competence") {
    if (!perso.competences.some((c) => c.id === id)) return NextResponse.json({ error: "compétence inconnue" }, { status: 400 });
    const domaine = domaineMoteur(String(body.domaine ?? ""));
    if (!nom || nom.length > 60) return NextResponse.json({ error: "nom invalide : 60 caractères maximum" }, { status: 400 });
    if (!domaine) return NextResponse.json({ error: "domaine invalide" }, { status: 400 });
    return enregistrer(supabase, user.id, {
      ...perso,
      competences: perso.competences.map((c) => (c.id === id ? { ...c, nom, domaine } : c)),
    });
  }

  if (kind === "zone") {
    const zone = perso.focus.find((f) => f.id === id);
    if (!zone) return NextResponse.json({ error: "zone inconnue" }, { status: 400 });
    const competenceId = String(body.competenceId ?? zone.competenceId);
    if (!nom || nom.length > 60) return NextResponse.json({ error: "nom invalide : 60 caractères maximum" }, { status: 400 });
    if (!competenceConnue(perso, competenceId)) return NextResponse.json({ error: "compétence inconnue" }, { status: 400 });
    return enregistrer(supabase, user.id, {
      ...perso,
      focus: perso.focus.map((f) => (f.id === id ? { ...f, nom, competenceId } : f)),
    });
  }

  if (kind === "exercice") {
    if (!perso.exercices.some((e) => e.id === id)) return NextResponse.json({ error: "exercice inconnu" }, { status: 400 });
    const construit = lireExercice(body, perso);
    if (construit instanceof NextResponse) return construit;
    return enregistrer(supabase, user.id, {
      ...perso,
      exercices: perso.exercices.map((e) =>
        e.id === id
          ? {
              ...e,
              nom: construit.nom.trim(),
              competenceId: construit.competenceId,
              focusId: construit.focusId,
              consigne: construit.consigne.trim(),
              valeur: construit.valeur,
              difficulte: construit.difficulte,
              materiel: construit.materiel?.length ? construit.materiel : ["aucun"],
              lien: construit.lien,
              mesure: "minutes",
            }
          : e,
      ),
    });
  }

  return NextResponse.json({ error: "type invalide" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response;
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string } | null;
  const id = body?.id ?? "";
  const { data } = await supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle();
  const perso = catalogueDe(data?.data);

  if (body?.kind === "competence") {
    return enregistrer(supabase, user.id, {
      ...perso,
      competences: perso.competences.filter((c) => c.id !== id),
      focus: perso.focus.filter((f) => f.competenceId !== id),
      exercices: perso.exercices.filter((e) => e.competenceId !== id),
    });
  }
  if (body?.kind === "zone") {
    return enregistrer(supabase, user.id, {
      ...perso,
      focus: perso.focus.filter((f) => f.id !== id),
      exercices: perso.exercices.filter((e) => e.focusId !== id),
    });
  }
  if (body?.kind === "exercice") {
    return enregistrer(supabase, user.id, {
      ...perso,
      exercices: perso.exercices.filter((e) => e.id !== id),
      epingles: perso.epingles.filter((x) => x !== id),
      masques: perso.masques.filter((x) => x !== id),
    });
  }
  return NextResponse.json({ error: "type invalide" }, { status: 400 });
}

function lireExercice(body: Record<string, unknown>, perso: CataloguePerso) {
  const nom = String(body.nom ?? "").trim();
  const competenceId = String(body.competenceId ?? "");
  const focusId = String(body.focusId ?? "");
  const consigne = String(body.consigne ?? "").trim();
  const valeur = Number(body.duree);
  const difficulte = String(body.difficulte ?? "");
  const lienBrut = String(body.lien ?? "");
  const materielBrut = String(body.materiel ?? "aucun");
  if (!nom || nom.length > 60) return NextResponse.json({ error: "nom invalide : 60 caractères maximum" }, { status: 400 });
  if (consigne.length > 300) return NextResponse.json({ error: "consigne invalide : 300 caractères maximum" }, { status: 400 });
  if (!Number.isInteger(valeur) || valeur < 2 || valeur > 30) {
    return NextResponse.json({ error: "durée invalide : 2 à 30 minutes" }, { status: 400 });
  }
  if (!estDifficulte(difficulte)) return NextResponse.json({ error: "difficulté invalide" }, { status: 400 });
  if (!zoneConnue(perso, competenceId, focusId)) return NextResponse.json({ error: "zone inconnue" }, { status: 400 });
  const lien = lienBrut.trim() ? lienHttps(lienBrut) : null;
  if (lienBrut.trim() && !lien) return NextResponse.json({ error: "lien invalide : https seulement" }, { status: 400 });
  const materiel = (MATERIELS as string[]).includes(materielBrut) ? (materielBrut as Materiel) : "aucun";
  return {
    nom,
    competenceId,
    focusId,
    consigne,
    valeur,
    difficulte,
    materiel: [materiel] as Materiel[],
    lien: lien ?? undefined,
  };
}
