/**
 * Applique supabase/schema sur le projet Supabase de TEST uniquement.
 * Ne lit jamais .env.local. Usage : pnpm db:apply:test
 */
import pg from "pg";
import { chargerEnv, verifierCibleTest } from "../e2e/helpers";
import { appliquerSchema } from "./appliquer-sql";

async function main(): Promise<void> {
  chargerEnv();
  verifierCibleTest();

  const code = await appliquerSchema();
  if (code > 0) process.exit(code);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ n: number }>("select count(*)::int as n from public.catalogue_officiel");
    const n = rows[0]?.n ?? 0;
    console.log(`catalogue_officiel : ${n}`);
    if (n !== 287) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
