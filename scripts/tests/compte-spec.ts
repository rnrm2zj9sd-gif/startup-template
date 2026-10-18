/**
 * Suppression RGPD : compte jetable, rpc supprimer_mon_compte, cascade profil.
 * Ne touche pas TEST_USER_A / B.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

function lireEnvLocal(): void {
  const fichier = path.join(process.cwd(), ".env.local");
  if (!existsSync(fichier)) return;
  for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
    const m = ligne.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main() {
  lireEnvLocal();
  const dbUrl = process.env.DATABASE_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!dbUrl || !url || !anon) throw new Error("variables Supabase manquantes");

  const id = randomUUID();
  const email = `rgpd-${id.slice(0, 8)}@example.test`;
  const password = `Rgpd-${randomBytes(9).toString("base64url")}`;
  const db = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await db.connect();

  try {
    await db.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change_token_new, email_change,
         email_change_token_current, phone_change, phone_change_token, reauthentication_token)
       values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
         extensions.crypt($3, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{"pseudo":"Rgpd"}', now(), now(),
         '', '', '', '', '', '', '', '')`,
      [id, email, password],
    );
    await db.query(
      `insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
       values (gen_random_uuid(), $1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text), 'email', now(), now())`,
      [id, email],
    );

    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: loginErr } = await client.auth.signInWithPassword({ email, password });
    assert.equal(loginErr, null, loginErr?.message);
    const { error: delErr } = await client.rpc("supprimer_mon_compte");
    assert.equal(delErr, null, delErr?.message);

    const restant = await db.query("select id from auth.users where id = $1", [id]);
    assert.equal(restant.rowCount, 0);
    const profil = await db.query("select id from public.profiles where id = $1", [id]);
    assert.equal(profil.rowCount, 0);
    console.log("ok  suppression RGPD (cascade)");
  } catch (e) {
    await db.query("delete from auth.users where id = $1", [id]).catch(() => undefined);
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
