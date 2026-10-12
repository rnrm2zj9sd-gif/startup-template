/**
 * Génère un lien magique sans envoyer d'e-mail (contourne la limite du plan gratuit).
 * Usage : npx tsx scripts/generate-magic-link.ts toi@email.com
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local (jamais dans git).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local absent
  }
}

loadEnvLocal();

const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Usage : npx tsx scripts/generate-magic-link.ts toi@email.com");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Ajoute SUPABASE_SERVICE_ROLE_KEY dans .env.local (Project Settings → API → service_role).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "http://localhost:3000/auth/callback" },
  });

  if (error || !data.properties?.action_link) {
    console.error(error?.message ?? "Lien introuvable.");
    process.exit(1);
  }

  console.log(data.properties.action_link);
}

void main();
