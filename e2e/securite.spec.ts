import { expect, test } from "@playwright/test";
import {
  admin,
  appelNavigateur,
  connecter,
  creerConfirme,
  emailE2E,
  jetonSession,
  lireLedger,
  motDePasseE2E,
  supprimerEmail,
} from "./helpers";

test("le navigateur ne peut pas écrire le ledger, le statut, is_admin, ni lire un autre joueur", async ({ page }) => {
  const email = emailE2E();
  const autreEmail = emailE2E();
  const password = motDePasseE2E();
  const autrePassword = motDePasseE2E();
  let userId = "";
  let autreId = "";
  const secret = `e2e-secret-${Date.now()}`;

  try {
    userId = await creerConfirme(email, password);
    autreId = await creerConfirme(autreEmail, autrePassword);
    const { error: missionError } = await admin().from("missions").insert({
      user_id: autreId,
      date_locale: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()),
      type: "daily",
      domaine: "life",
      competence_id: "e2e",
      titre: secret,
      payload: { source: "libre" },
      statut: "a_faire",
    });
    if (missionError) throw new Error(missionError.message);

    await connecter(page, email, password);
    const token = jetonSession(await page.context().cookies());

    const insertLedger = await appelNavigateur(page, token, "xp_ledger", "POST", {
      user_id: userId,
      montant: 40,
      raison: "mission",
      domaine: "life",
    });
    expect(insertLedger.status).toBeGreaterThanOrEqual(400);
    expect(await lireLedger(userId)).toHaveLength(0);

    const updateMission = await appelNavigateur(
      page,
      token,
      `missions?user_id=eq.${autreId}`,
      "PATCH",
      { statut: "terminee" },
    );
    expect(updateMission.status).toBeGreaterThanOrEqual(400);
    const { data: missionAutre } = await admin().from("missions").select("statut, titre").eq("user_id", autreId).single();
    expect(missionAutre?.statut).toBe("a_faire");
    expect(missionAutre?.titre).toBe(secret);

    const updateAdmin = await appelNavigateur(page, token, `profiles?id=eq.${userId}`, "PATCH", { is_admin: true });
    expect(updateAdmin.status).toBeGreaterThanOrEqual(400);
    const { data: profil } = await admin().from("profiles").select("is_admin").eq("id", userId).single();
    expect(profil?.is_admin).toBe(false);

    const lireProfil = await appelNavigateur(page, token, `profiles?select=id,pseudo&id=eq.${autreId}`, "GET");
    const lireMissionsAutre = await appelNavigateur(
      page,
      token,
      `missions?select=id,titre,user_id&user_id=eq.${autreId}`,
      "GET",
    );
    expect(lireProfil.text).not.toContain(autreId);
    expect(lireMissionsAutre.text).not.toContain(secret);
    expect(lireMissionsAutre.text).not.toContain(autreId);
  } finally {
    await supprimerEmail(email);
    await supprimerEmail(autreEmail);
  }
});
