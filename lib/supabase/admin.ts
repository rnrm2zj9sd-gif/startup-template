import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client service_role. Serveur uniquement, jamais importé par un composant client. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !cle) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  }
  if (!client) {
    client = createClient(url, cle, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
