import { emailExposeLien, origineDepuis } from "@/lib/auth/origine";
import { envoyerEmail, emailConfigure } from "@/lib/email/envoyer";
import { emailMotDePasseOublie } from "@/lib/email/modele";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const OK = { ok: true as const };
const recent = new Map<string, number>();

function tropTot(email: string): boolean {
  const now = Date.now();
  const dernier = recent.get(email) ?? 0;
  if (now - dernier < 60_000) return true;
  recent.set(email, now);
  return false;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Indique un e-mail valide." }, { status: 400 });
  }
  if (tropTot(email)) return NextResponse.json(OK);

  const origin = origineDepuis(request);
  const redirectTo = `${origin}/auth/callback?next=/nouveau-mot-de-passe`;
  let lien: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (!error && data.properties?.hashed_token) {
      lien = `${origin}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/nouveau-mot-de-passe`;
    }
  } catch {
    // Pas de clé service : on laisse Resend de côté et on tente le repli GoTrue.
  }

  try {
    if (lien && emailConfigure()) {
      const modele = emailMotDePasseOublie(lien);
      await envoyerEmail({ to: email, sujet: modele.sujet, html: modele.html });
    } else if (!lien) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anon) {
        const { createClient } = await import("@supabase/supabase-js");
        await createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }).auth.resetPasswordForEmail(
          email,
          { redirectTo },
        );
      } else if (!emailExposeLien()) {
        return NextResponse.json({ error: "E-mails non configurés." }, { status: 503 });
      }
    } else if (!emailExposeLien()) {
      return NextResponse.json({ error: "E-mails non configurés." }, { status: 503 });
    }
  } catch {
    return NextResponse.json(OK);
  }

  if (emailExposeLien() && lien) return NextResponse.json({ ...OK, lien });
  return NextResponse.json(OK);
}
