import assert from "node:assert/strict";
import test from "node:test";
import { emailExposeLien } from "./origine";

const REF_PROD = "kazdyhxetsevlpxexmof";
const URL_TEST = "https://wpiyjbdsrmgadjosbhvw.supabase.co";
const URL_PROD = `https://${REF_PROD}.supabase.co`;

function avec(env: Record<string, string | undefined>, fn: () => void) {
  const avant = {
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_RETOUR_LIEN: process.env.EMAIL_RETOUR_LIEN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
  for (const cle of Object.keys(avant) as (keyof typeof avant)[]) {
    delete process.env[cle];
  }
  for (const [cle, valeur] of Object.entries(env)) {
    if (valeur !== undefined) process.env[cle] = valeur;
  }
  try {
    fn();
  } finally {
    for (const [cle, valeur] of Object.entries(avant)) {
      if (valeur === undefined) delete process.env[cle];
      else process.env[cle] = valeur;
    }
  }
}

test("développement : le lien est renvoyé", () => {
  avec({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: URL_PROD }, () => {
    assert.equal(emailExposeLien(), true);
  });
});

test("production sans drapeau : le lien n'est pas renvoyé", () => {
  avec({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: URL_TEST }, () => {
    assert.equal(emailExposeLien(), false);
  });
});

test("drapeau et projet de test : le lien est renvoyé", () => {
  avec({ NODE_ENV: "production", EMAIL_RETOUR_LIEN: "1", NEXT_PUBLIC_SUPABASE_URL: URL_TEST }, () => {
    assert.equal(emailExposeLien(), true);
  });
});

test("drapeau et projet de prod : le lien n'est pas renvoyé", () => {
  avec({ NODE_ENV: "production", EMAIL_RETOUR_LIEN: "1", NEXT_PUBLIC_SUPABASE_URL: URL_PROD }, () => {
    assert.equal(emailExposeLien(), false);
  });
});
