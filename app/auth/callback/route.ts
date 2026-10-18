import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const OTP_TYPES: EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email", "email_change"];

function safeNext(path: string | null, type: string | null): string {
  if (type === "recovery") return "/nouveau-mot-de-passe";
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/auth/")) {
    return "/dashboard";
  }
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeBrut = searchParams.get("type");
  const type = OTP_TYPES.find((t) => t === typeBrut) ?? null;
  const next = safeNext(searchParams.get("next"), type);

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
