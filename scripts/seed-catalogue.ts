/**
 * Génère les INSERT rejouables de catalogue_officiel à partir de lib/moteur.
 * Écrit supabase/schema/06_donnees.sql (rejouable).
 *
 *   pnpm db:seed-catalogue
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATALOGUE } from "../lib/moteur";
import { difficulteDepuisNiveau } from "../lib/progression/generer";

const FICHIER = path.join(process.cwd(), "supabase/schema/06_donnees.sql");

function sql(valeur: string): string {
  return `'${valeur.replace(/'/g, "''")}'`;
}

function lignes(): string[] {
  const out: string[] = [];
  for (const competence of Object.values(CATALOGUE)) {
    for (const exercice of competence.exercices) {
      const diff = difficulteDepuisNiveau(exercice.niveau);
      out.push(
        `insert into public.catalogue_officiel (exercice_id, competence_id, focus_id, duree_min, duree_max, difficulte, niveau) values (${sql(exercice.id)}, ${sql(competence.id)}, ${sql(exercice.focusId)}, 2, 60, ${sql(diff)}, ${exercice.niveau}) on conflict (exercice_id) do update set competence_id = excluded.competence_id, focus_id = excluded.focus_id, duree_min = excluded.duree_min, duree_max = excluded.duree_max, difficulte = excluded.difficulte, niveau = excluded.niveau;`,
      );
    }
  }
  return out;
}

function main() {
  const toutes = lignes();
  writeFileSync(FICHIER, `-- Catalogue officiel (rejouable, on conflict update).\n${toutes.join("\n")}\n`);
  console.log(`schema/06_donnees.sql : ${toutes.length} exercices.`);
}

mkdirSync(path.dirname(FICHIER), { recursive: true });
main();
