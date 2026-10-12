// Démo : npx tsx demo.ts
import { CATALOGUE, verifierCatalogue } from "./lib/moteur/catalogue";
import { catalogPersoDemo } from "./lib/moteur/catalogue-perso-demo";
import { fusionnerCatalogue } from "./lib/moteur/personnalisation";
import { ajouterJours, enregistrerResultat, etatInitial, planifierSemaine, seancesDuJour } from "./lib/moteur/moteur";
import type { JourPlan, Profil, Ressenti } from "./lib/moteur/types";

const profil: Profil = {
  userId: "demo-willy",
  materiel: ["aucun", "papier_stylo", "telephone"],
  budgetMinutesJour: 45,
  catalogPerso: catalogPersoDemo,
  choix: [
    { competenceId: "musculation", focusIds: ["abdos", "epaules", "bras", "dos", "avant-bras"], seancesParSemaine: 5, minutesMax: 15 },
    { competenceId: "education-financiere", focusIds: ["suivi", "culture-finance", "budget"], seancesParSemaine: 3, minutesMax: 10 },
    { competenceId: "passage-action", focusIds: ["planification", "procrastination"], seancesParSemaine: 5, minutesMax: 10 },
    { competenceId: "cours", focusIds: ["maths", "anglais", "comptabilite"], seancesParSemaine: 5, minutesMax: 20 },
    { competenceId: "guitare", focusIds: [], seancesParSemaine: 3, minutesMax: 15 },
  ],
};

const erreurs = verifierCatalogue(catalogPersoDemo);
if (erreurs.length) console.log("⚠️ Catalogue :\n- " + erreurs.join("\n- "));
else console.log("Catalogue : OK, aucune erreur.");

const catalogue = fusionnerCatalogue(CATALOGUE, catalogPersoDemo);

function afficher(plan: JourPlan[]) {
  for (const j of plan) {
    console.log(`\n━━ ${j.jour} ${j.date} — ${j.minutesTotal} min ━━`);
    if (!j.seances.length) console.log("  Repos 💤");
    for (const s of j.seances) {
      console.log(`  ▶ ${s.competence} : ${s.focusNoms.join(" + ")}  (${s.minutesTotal} min, ~${s.xpEstime} XP)`);
      if (s.echauffement) console.log(`     échauffement — ${s.echauffement}`);
      for (const e of s.exercices) {
        const badge = e.perso ? " [perso]" : "";
        console.log(`     • ${e.nom}${badge} [${e.focus}] — ${e.prescription}`);
        if (e.ressource) console.log(`     📺 Idées : ${e.ressource.suggestions.join(", ")}`);
      }
      console.log(`     ⤷ jour difficile : ${s.missionPlancher}`);
    }
  }
}

function controles(plan: JourPlan[], label: string) {
  const matieres = new Set<string>();
  const zones = new Set<string>();
  const competences = new Set<string>();
  const depassements = plan.filter((j) => j.minutesTotal > profil.budgetMinutesJour);
  for (const j of plan) {
    for (const s of j.seances) {
      competences.add(s.competenceId);
      s.focusIds.forEach((id) => zones.add(id));
      if (s.competenceId === "cours") s.focusIds.forEach((id) => matieres.add(id));
    }
  }
  console.log(`\n── Contrôles ${label} ──`);
  console.log(`  maths / anglais / comptabilité présents : ${["maths", "anglais", "comptabilite"].map((m) => `${m}=${matieres.has(m) ? "oui" : "NON"}`).join(" · ")}`);
  console.log(`  avant-bras / guitare : avant-bras=${zones.has("avant-bras") ? "oui" : "NON"} · guitare=${competences.has("guitare") ? "oui" : "NON"}`);
  console.log(`  jours > ${profil.budgetMinutesJour} min : ${depassements.length ? depassements.map((j) => `${j.jour} ${j.minutesTotal}`).join(", ") : "aucun"}`);
}

let etat = etatInitial();
console.log("\n################ SEMAINE 1 ################");
const s1 = planifierSemaine(profil, etat, CATALOGUE, "2026-10-12");
afficher(s1);
controles(s1, "semaine 1");

const ressentis: Ressenti[] = ["bien", "trop_facile", "bien", "bien", "pas_fait", "bien", "trop_facile", "trop_dur", "bien", "bien"];
let n = 0;
for (let d = 0; d < 21; d++) {
  const date = ajouterJours("2026-10-12", d);
  for (const s of seancesDuJour(profil, etat, CATALOGUE, date).seances) {
    etat = enregistrerResultat(etat, s, ressentis[n++ % ressentis.length]);
  }
}

console.log("\n\n################ Progression après 3 semaines ################");
for (const [k, p] of Object.entries(etat.progression)) console.log(`  ${k.padEnd(40)} niveau ${p.niveau} · palier ${p.palier}/4`);
console.log(`  Chaîne : ${etat.chaineJours} jours`);

console.log("\n\n################ SEMAINE 4 (adaptée) ################");
const s4 = planifierSemaine(profil, etat, CATALOGUE, "2026-11-02");
afficher(s4);
controles(s4, "semaine 4");

const niveauxS4 = s4.flatMap((j) =>
  j.seances.flatMap((s) =>
    s.exercices.map((e) => catalogue[s.competenceId].exercices.find((x) => x.id === e.exerciceId)!.niveau),
  ),
);
console.log(`  niveaux des exercices : ${[...new Set(niveauxS4)].sort().join(", ")}`);
console.log(`  au moins un exo niveau ≥ 2 : ${niveauxS4.some((n) => n >= 2) ? "oui" : "NON"}`);
