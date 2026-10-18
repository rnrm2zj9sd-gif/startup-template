import { creerJetonSuppression } from "@/lib/auth/jeton-compte";
import { emailExposeLien, origineDepuis } from "@/lib/auth/origine";
import { emailConfigure, envoyerEmail } from "@/lib/email/envoyer";
import { emailDemandeSuppression } from "@/lib/email/modele";
import { requireUser } from "@/lib/progression/auth-api";
import { NextResponse } from "next/server";

/** Envoie le lien de confirmation de suppression (RGPD). */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  if (!user.email) return NextResponse.json({ error: "E-mail introuvable sur ce compte." }, { status: 400 });

  const { jeton } = creerJetonSuppression(user.id);
  const origin = origineDepuis(request);
  const lien = `${origin}/supprimer-compte?jeton=${encodeURIComponent(jeton)}`;

  if (emailConfigure()) {
    const modele = emailDemandeSuppression(lien);
    await envoyerEmail({ to: user.email, sujet: modele.sujet, html: modele.html });
  } else if (!emailExposeLien()) {
    return NextResponse.json({ error: "E-mails non configurés." }, { status: 503 });
  }

  if (emailExposeLien()) return NextResponse.json({ ok: true, lien });
  return NextResponse.json({ ok: true });
}
