import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { balayerComptesE2E, compterProfils, comptesE2ERestants } from "./helpers";

export default async function globalTeardown() {
  await balayerComptesE2E();
  const apres = await compterProfils();
  const restants = await comptesE2ERestants();
  let avant = "inconnu";
  try {
    avant = String(JSON.parse(readFileSync(resolve(process.cwd(), "test-results/profils-avant.json"), "utf8")).avant);
  } catch {
    // le setup n'a pas écrit le fichier
  }
  console.log(`profils_avant=${avant}`);
  console.log(`profils_apres=${apres}`);
  console.log(`comptes_e2e_restants=${restants.length}`);
  if (restants.length > 0) {
    throw new Error(`${restants.length} compte(s) e2e encore en base`);
  }
}
