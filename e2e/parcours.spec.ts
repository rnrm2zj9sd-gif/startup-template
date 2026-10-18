import { expect, test, type Page } from "@playwright/test";
import {
  emailE2E,
  idDepuisEmail,
  lireLedger,
  lireMissions,
  lireValidations,
  motDePasseE2E,
  niveauDepuisXp,
  sommeLedger,
  supprimerEmail,
  xpPourNiveau,
} from "./helpers";

async function inscrire(page: Page, email: string, password: string): Promise<string> {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("E2E");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-password-confirm").fill(password);
  await page.getByTestId("gender-male").click();
  await page.getByTestId("signup-submit").click();

  const confirmation = page.getByTestId("signup-check-email");
  const pseudo = page.getByTestId("onboarding-pseudo");
  const erreur = page.getByTestId("signup-error");
  await expect(confirmation.or(pseudo).or(erreur)).toBeVisible();

  if (await confirmation.isVisible() || await erreur.isVisible()) {
    throw new Error("Confirm email actif sur le projet de test");
  }

  test.info().annotations.push({
    type: "inscription",
    description: "Inscription par l'interface, session immédiate.",
  });
  const id = await idDepuisEmail(email);
  if (!id) throw new Error("Compte introuvable après l'inscription");
  return id;
}

async function garderZone(page: Page, competenceId: string, focusId: string) {
  const zones = page.locator(`[data-testid="onboarding-zone"][data-competence-id="${competenceId}"]`);
  const ids = await zones.evaluateAll((els) => els.map((el) => el.getAttribute("data-focus-id")));
  for (const id of ids) {
    if (!id || id === focusId) continue;
    const zone = page.locator(
      `[data-testid="onboarding-zone"][data-competence-id="${competenceId}"][data-focus-id="${id}"]`,
    );
    if ((await zone.getAttribute("aria-pressed")) === "true") await zone.click();
  }
}

async function terminerOnboarding(page: Page) {
  await page.getByTestId("onboarding-pseudo").fill("Joueur E2E");
  await page.getByTestId("gender-male").click();
  await page.getByTestId("onboarding-continuer").click();

  const choix = [
    { id: "education-financiere", zone: "culture-finance" },
    { id: "hygiene-de-vie", zone: "alimentation" },
    { id: "endurance", zone: "cardio" },
  ];
  for (const choixCompetence of choix) {
    await page.locator(`[data-testid="onboarding-competence"][data-competence-id="${choixCompetence.id}"]`).click();
    await garderZone(page, choixCompetence.id, choixCompetence.zone);
  }
  await page.getByTestId("onboarding-continuer").click();

  await page.getByTestId("onboarding-budget-60").click();
  await page.getByTestId("onboarding-materiel-telephone").click();
  await page.getByTestId("onboarding-continuer").click();
  await page.getByTestId("onboarding-commencer").click();
  await expect(page.getByTestId("onboarding-victoire")).toBeVisible();
  await page.goto("/dashboard");
}

async function fermerMontee(page: Page) {
  const continuer = page.getByTestId("level-up-continuer");
  if (await continuer.isVisible()) await continuer.click();
}

test("parcours joueur vierge", async ({ page }) => {
  const email = emailE2E();
  const password = motDePasseE2E();
  let userId = "";
  const fuites: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("kazdyhxetsevlpxexmof")) fuites.push(req.url());
  });

  try {
    expect(await xpPourNiveau(1)).toBe(40);

    userId = await inscrire(page, email, password);
    await terminerOnboarding(page);

    const daily = page.getByTestId("daily-system");
    await expect(daily.getByTestId("player-level")).toHaveAttribute("data-value", "1");
    await expect(daily.getByTestId("player-xp")).toHaveAttribute("data-value", "0");
    await expect(daily.getByTestId("player-rank")).toHaveAttribute("data-value", "E");
    await expect(daily.getByTestId("mission").first()).toBeVisible();

    const premiere = daily.locator('[data-testid="mission"][data-type="first"]');
    await expect(premiere).toBeVisible();
    const missionId = await premiere.getAttribute("data-mission-id");
    if (!missionId) throw new Error("Mission sans identifiant");
    await premiere.getByTestId("mission-valider").click();
    await expect(daily.getByTestId("player-xp")).not.toHaveAttribute("data-value", "0");

    const ledger = await lireLedger(userId);
    expect(ledger).toHaveLength(1);
    const xpAffiche = Number(await daily.getByTestId("player-xp").getAttribute("data-value"));
    expect(ledger[0].montant).toBe(xpAffiche);
    expect(await lireValidations(userId)).toHaveLength(1);
    const mission = (await lireMissions(userId)).find((m) => m.id === missionId);
    expect(mission?.statut).toBe("terminee");

    for (let i = 0; i < 12; i++) {
      if ((await daily.getByTestId("player-level").getAttribute("data-value")) === "2") break;
      await fermerMontee(page);
      const bouton = daily.getByTestId("mission-valider").first();
      await expect(bouton).toBeVisible();
      const avant = await daily.getByTestId("player-xp").getAttribute("data-value");
      await bouton.click();
      await expect
        .poll(async () => {
          const niveau = await daily.getByTestId("player-level").getAttribute("data-value");
          const xp = await daily.getByTestId("player-xp").getAttribute("data-value");
          return niveau === "2" || xp !== avant;
        })
        .toBe(true);
    }

    await fermerMontee(page);
    const total = sommeLedger(await lireLedger(userId));
    const niveauSql = await niveauDepuisXp(total);
    expect(niveauSql).toBe(2);
    await expect(daily.getByTestId("player-level")).toHaveAttribute("data-value", String(niveauSql));
    await expect(daily.locator('[data-testid="journal-ligne"][data-log-type="niveau_gagne"]')).toBeVisible();

    const xp = await daily.getByTestId("player-xp").getAttribute("data-value");
    const rang = await daily.getByTestId("player-rank").getAttribute("data-value");
    await page.reload();
    const apresRecharge = page.getByTestId("daily-system");
    await expect(apresRecharge.getByTestId("player-level")).toHaveAttribute("data-value", "2");
    await expect(apresRecharge.getByTestId("player-xp")).toHaveAttribute("data-value", xp ?? "");
    await expect(apresRecharge.getByTestId("player-rank")).toHaveAttribute("data-value", rang ?? "");

    const ledgerAvant = await lireLedger(userId);
    const xpAvant = await apresRecharge.getByTestId("player-xp").getAttribute("data-value");
    await page.evaluate(async (id) => {
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ressenti: "bien" }),
      };
      await Promise.all([
        fetch(`/api/missions/${id}/valider`, options),
        fetch(`/api/missions/${id}/valider`, options),
      ]);
    }, missionId);
    await expect(apresRecharge.getByTestId("player-xp")).toHaveAttribute("data-value", xpAvant ?? "");
    const ledgerApres = await lireLedger(userId);
    expect(ledgerApres).toHaveLength(ledgerAvant.length);
    expect(sommeLedger(ledgerApres)).toBe(sommeLedger(ledgerAvant));
    expect(fuites).toEqual([]);
  } finally {
    await supprimerEmail(email);
  }
});
