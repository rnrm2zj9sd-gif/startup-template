import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compterProfils } from "./helpers";

export default async function globalSetup() {
  const avant = await compterProfils();
  const dossier = resolve(process.cwd(), "test-results");
  mkdirSync(dossier, { recursive: true });
  writeFileSync(resolve(dossier, "profils-avant.json"), JSON.stringify({ avant }));
  console.log(`profils_avant=${avant}`);
}
