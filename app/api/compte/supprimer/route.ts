import { lireJetonSuppression } from "@/lib/auth/jeton-compte";
import { emailConfigure, envoyerEmail } from "@/lib/email/envoyer";
import { emailCompteSupprime } from "@/lib/email/modele";
import { requireUser } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { jeton?: unknown; confirmation?: unknown } | null;
  const jeton = typeof body?.jeton === "string" ? body.jeton.trim() : "";
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim().toUpperCase() : "";
  if (confirmation !== "SUPPRIMER") {
    return NextResponse.json({ error: "Écris SUPPRIMER pour confirmer." }, { status: 400 });
  }
  const lu = lireJetonSuppression(jeton);
  if (!lu) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });

  const { supabase, user, response } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Reconnecte-toi, puis confirme la suppression." }, { status: 401 });
  }
  if (user.id !== lu.userId) {
    return NextResponse.json({ error: "Ce lien ne correspond pas à ce compte." }, { status: 403 });
  }

  const email = user.email ?? null;
  const { error } = await supabase.rpc("supprimer_mon_compte");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (email && emailConfigure()) {
    const modele = emailCompteSupprime();
    await envoyerEmail({ to: email, sujet: modele.sujet, html: modele.html }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
