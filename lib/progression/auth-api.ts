import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null, response: NextResponse.json({ error: "non authentifié" }, { status: 401 }) };
  }
  return { supabase, user, response: null };
}

export function rpcErrorStatus(message: string): number {
  if (message.includes("non authentifié")) return 401;
  if (message.includes("ne t'appartient") || message.includes("interdit")) return 403;
  if (message.includes("introuvable")) return 404;
  if (message.includes("déjà validée") || message.includes("limite atteinte") || message.includes("au moins une")) return 409;
  if (message.includes("invalide") || message.includes("trop longue")) return 400;
  return 500;
}
