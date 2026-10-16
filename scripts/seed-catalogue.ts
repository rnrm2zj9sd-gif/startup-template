/**
 * Génère les INSERT rejouables de catalogue_officiel à partir de lib/moteur.
 * Découpe en fichiers supabase/apply de moins de 80 lignes.
 *
 *   pnpm db:seed-catalogue
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATALOGUE } from "../lib/moteur";
import { difficulteDepuisNiveau } from "../lib/progression/generer";

const DIR = path.join(process.cwd(), "supabase/apply");
const PAR_FICHIER = 70;

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
  for (const f of readdirSync(DIR)) {
    if (/^4[6-9]_catalogue_officiel_seed_/.test(f) || /^5\d_catalogue_officiel_seed_/.test(f)) unlinkSync(path.join(DIR, f));
  }
  const toutes = lignes();
  let n = 0;
  for (let i = 0; i < toutes.length; i += PAR_FICHIER) {
    n += 1;
    const bloc = toutes.slice(i, i + PAR_FICHIER);
    const fichier = path.join(DIR, `46_catalogue_officiel_seed_${String(n).padStart(2, "0")}.sql`);
    const corps = [
      `-- Catalogue officiel, partie ${n} (généré par pnpm db:seed-catalogue, rejouable).`,
      ...bloc,
      "",
    ].join("\n");
    if (corps.split("\n").length > 80) throw new Error(`fichier trop long : ${fichier}`);
    writeFileSync(fichier, corps);
    console.log(`${path.basename(fichier)} : ${bloc.length} exercices`);
  }
  console.log(`Total : ${toutes.length} exercices.`);
}

mkdirSync(DIR, { recursive: true });
main();
