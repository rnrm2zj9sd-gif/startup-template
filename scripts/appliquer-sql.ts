/**
 * Applique dans l'ordre les fichiers supabase/schema/NN_*.sql sur DATABASE_URL (.env.local),
 * affiche OK ou l'erreur pour chacun, puis le tableau de vérification du dernier fichier.
 * Usage : npx tsx scripts/appliquer-sql.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client, type QueryResult } from "pg";

const ROOT = process.cwd();
const SCHEMA_DIR = path.join(ROOT, "supabase/schema");

function lireEnvLocal(): void {
  const fichier = path.join(ROOT, ".env.local");
  if (!existsSync(fichier)) return;
  for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
    const m = ligne.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main(): Promise<void> {
  lireEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL absent de .env.local (ou fichier non enregistré).");
    process.exit(1);
  }

  const fichiers = readdirSync(SCHEMA_DIR)
    .filter((f) => /^\d{2}_.+\.sql$/.test(f))
    .sort();

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let echecs = 0;
  let verification: QueryResult | null = null;
  try {
    for (const f of fichiers) {
      const sql = readFileSync(path.join(SCHEMA_DIR, f), "utf8");
      try {
        const res = (await client.query(sql)) as QueryResult | QueryResult[];
        console.log(`OK      ${f}`);
        const dernier = Array.isArray(res) ? res.at(-1)! : res;
        if (dernier.rows?.some((r) => "present" in r)) verification = dernier;
      } catch (e) {
        echecs++;
        const err = e as { message?: string; code?: string };
        console.log(`ERREUR  ${f} : ${err.message ?? e}${err.code ? ` (code ${err.code})` : ""}`);
      }
    }
  } finally {
    await client.end();
  }

  if (verification) {
    console.log("\nVérification :");
    console.table(verification.rows);
    const manquants = verification.rows.filter((r) => !r.present);
    console.log(manquants.length === 0 ? "Tout est présent." : `${manquants.length} élément(s) manquant(s).`);
  }
  if (echecs > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Connexion impossible :", (e as Error).message);
  process.exit(1);
});
