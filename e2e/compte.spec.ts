import { expect, test } from "@playwright/test";
import { creerJetonSuppression } from "../lib/auth/jeton-compte";
import {
  admin,
  confirmerOuCreer,
  connecter,
  emailE2E,
  idDepuisEmail,
  motDePasseE2E,
  supprimerEmail,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test("récupérer le mot de passe puis effacer le compte", async ({ page, baseURL }) => {
  const email = emailE2E();
  const password = motDePasseE2E();
  const suivant = `${password}B`;
  const origin = baseURL ?? "http://localhost:3000";
  let userId: string | null = null;

  try {
    userId = await confirmerOuCreer(email, password);

    await page.goto("/mot-de-passe-oublie");
    await page.getByTestId("forgot-email").fill(email);
    await page.getByTestId("forgot-submit").click();
    await expect(page.getByTestId("forgot-sent")).toBeVisible();

    const { data, error } = await admin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/nouveau-mot-de-passe` },
    });
    if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Lien recovery introuvable");

    await page.goto(
      `/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/nouveau-mot-de-passe`,
    );
    await page.getByTestId("new-password").fill(suivant);
    await page.getByTestId("new-password-confirm").fill(suivant);
    await page.getByTestId("new-password-submit").click();
    await page.waitForURL(/\/(dashboard|onboarding)/);

    await page.context().clearCookies();
    await connecter(page, email, suivant);

    await admin().from("profiles").update({ onboarding_done: true }).eq("id", userId);
    await page.goto("/dashboard/parametres");
    await page.getByTestId("delete-request").click();
    await expect(page.getByTestId("delete-sent")).toBeVisible();

    const { jeton } = creerJetonSuppression(userId);
    await page.goto(`/supprimer-compte?jeton=${encodeURIComponent(jeton)}`);
    await page.getByTestId("confirm-delete").fill("SUPPRIMER");
    await page.getByTestId("confirm-delete-submit").click();
    await expect(page.getByTestId("compte-supprime")).toBeVisible();

    expect(await idDepuisEmail(email)).toBeNull();
    userId = null;
  } finally {
    if (userId) await supprimerEmail(email);
  }
});
