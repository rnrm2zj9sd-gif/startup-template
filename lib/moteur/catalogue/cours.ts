import type { Competence, Exercice, Focus } from "../types";
import { A, ex } from "./outils";

const f = (id: string, nom: string): Focus => ({ id, nom, recuperationJours: 0 });

const VIDEO_COURS = "une vidéo de cours sur YouTube sur ce chapitre";
const LYCEE = ["Les Bons Profs", "Schoolmouv"];

/**
 * Méthodes communes à toutes les matières.
 * Pour ajouter une matière : un focus + `...exercicesMatiere(id, nom, videos)` + 2 ou 3 exercices spécifiques.
 */
function de(matiere: string): string {
  return /^[aeiouàâäéèêëïîôùû]/i.test(matiere) ? `d'${matiere}` : `de ${matiere}`;
}

export function exercicesMatiere(focusId: string, matiere: string, videos: string[]): Exercice[] {
  const ressourceVideo: Exercice["ressource"] = { type: "video", suggestions: videos };
  const deM = de(matiere);
  return [
    ex(focusId, `${focusId}-relire-cours`, `Relire le dernier cours ${deM}`, 1, A(10), `Relis ton dernier cours ${deM} et surligne les idées clés.`, ["aucun"], "Relis une page de ton cours."),
    ex(focusId, `${focusId}-video-chapitre`, `Vidéo sur le chapitre ${deM}`, 1, A(10), `Regarde une vidéo explicative du chapitre en cours en ${matiere} et note ce que tu as compris.`, ["telephone"], undefined, ressourceVideo),
    ex(focusId, `${focusId}-fiche-chapitre`, `Fiche de révision — ${matiere}`, 2, A(15), `Rédige une fiche d'un chapitre ${deM} : titre, 5 idées, un exemple.`, ["papier_stylo"]),
    ex(focusId, `${focusId}-flashcards`, `10 flashcards — ${matiere}`, 2, A(10), `Crée 10 flashcards sur le chapitre en cours en ${matiere}.`, ["telephone"], undefined, { type: "app", suggestions: ["Anki", "Quizlet"] }),
    ex(focusId, `${focusId}-rappel-actif`, `Rappel actif — ${matiere}`, 2, A(10), `Sans tes notes, écris tout ce que tu sais du chapitre ${deM}, puis corrige.`, ["papier_stylo"]),
    ex(focusId, `${focusId}-exercices-types`, `Exercices types — ${matiere}`, 3, A(20), `Fais des exercices types ${deM}, puis corrige chaque erreur.`, ["papier_stylo"]),
    ex(focusId, `${focusId}-expliquer-haut`, `Expliquer le chapitre — ${matiere}`, 3, A(10), `Explique à voix haute le chapitre ${deM} comme à un camarade, sans tes notes.`, ["aucun"]),
    ex(focusId, `${focusId}-annale`, `Sujet d'annale — ${matiere}`, 4, A(25), `Traite une partie d'un sujet d'annale ou de partiel ${deM}, chronométré.`, ["papier_stylo"]),
  ];
}

export const cours: Competence = {
  id: "cours",
  nom: "Cours & révisions",
  domaine: "Études",
  focusParSeance: 1,
  focus: [
    f("maths", "Maths"),
    f("francais", "Français"),
    f("anglais", "Anglais"),
    f("histoire-geo", "Histoire-géo"),
    f("physique-chimie", "Physique-chimie"),
    f("svt", "SVT"),
    f("ses", "SES"),
    f("philosophie", "Philosophie"),
    f("economie", "Économie"),
    f("droit", "Droit"),
    f("management", "Management"),
    f("comptabilite", "Comptabilité"),
    f("gestion", "Gestion"),
  ],
  exercices: [
    ...exercicesMatiere("maths", "maths", ["Yvan Monka", "Les Bons Profs", "Khan Academy"]),
    ex("maths", "maths-refaire-rates", "Refaire 3 exercices ratés", 2, A(15), "Reprends 3 exercices de maths que tu as ratés et refais-les jusqu'à la bonne réponse.", ["papier_stylo"]),
    ex("maths", "maths-cinq-formules", "Apprendre 5 formules", 1, A(10), "Écris 5 formules du chapitre, cache-les, puis récite-les.", ["papier_stylo"], "Écris une formule et redis-la sans regarder."),

    ...exercicesMatiere("francais", "français", LYCEE),
    ex("francais", "francais-analyser-paragraphe", "Analyser un paragraphe", 2, A(15), "Prends un paragraphe et note : idée, procédé, effet.", ["papier_stylo"]),
    ex("francais", "francais-intro", "Rédiger une introduction", 3, A(20), "Rédige une introduction complète (accroche, amorce, problématique, annonce) et relis-la à voix haute.", ["papier_stylo"]),

    ...exercicesMatiere("anglais", "anglais", LYCEE),
    ex("anglais", "anglais-dix-mots", "Apprendre 10 mots de vocabulaire", 1, A(10), "Apprends 10 mots et fais une phrase avec chacun.", ["papier_stylo"], "Apprends 3 mots et fais une phrase."),
    ex("anglais", "anglais-ecoute-vo", "10 min d'écoute en VO", 2, A(10), "Écoute 10 min en VO et note 5 expressions nouvelles.", ["telephone"]),
    ex("anglais", "anglais-cinq-phrases", "Écrire 5 phrases en anglais", 1, A(10), "Écris 5 phrases sur le chapitre en cours, puis corrige un accord ou un temps."),

    ...exercicesMatiere("histoire-geo", "histoire-géo", LYCEE),
    ex("histoire-geo", "histoire-geo-frise", "Frise de 10 dates", 2, A(10), "Place 10 dates du chapitre sur une frise, de mémoire puis corrige.", ["papier_stylo"]),
    ex("histoire-geo", "histoire-geo-croquis", "Croquis de mémoire", 3, A(15), "Dessine de mémoire un croquis du chapitre, puis compare avec le modèle.", ["papier_stylo"]),

    ...exercicesMatiere("physique-chimie", "physique-chimie", ["Les Bons Profs", "Khan Academy"]),
    ex("physique-chimie", "physique-chimie-calcul", "Refaire un exercice de calcul", 2, A(15), "Refais un exercice de calcul en écrivant chaque unité, puis vérifie le résultat.", ["papier_stylo"]),
    ex("physique-chimie", "physique-chimie-schema", "Schéma d'expérience", 2, A(10), "Dessine le schéma d'une expérience du chapitre et légende 5 éléments.", ["papier_stylo"]),

    ...exercicesMatiere("svt", "SVT", LYCEE),
    ex("svt", "svt-schema-legende", "Schéma légendé", 2, A(10), "Reproduis un schéma du cours et ajoute toutes les légendes de mémoire.", ["papier_stylo"]),
    ex("svt", "svt-cinq-notions", "Définir 5 notions de SVT", 1, A(10), "Écris 5 définitions du chapitre, puis compare avec le cours."),

    ...exercicesMatiere("ses", "SES", LYCEE),
    ex("ses", "ses-cinq-notions", "Définir 5 notions de SES", 1, A(10), "Écris 5 notions du chapitre en une phrase chacune."),
    ex("ses", "ses-graphique", "Analyser un graphique", 2, A(15), "Prends un graphique ou un document statistique : lis le titre, un chiffre, une limite.", ["papier_stylo"]),

    ...exercicesMatiere("philosophie", "philosophie", LYCEE),
    ex("philosophie", "philosophie-problematiser", "Problématiser un sujet", 3, A(15), "À partir d'un sujet, écris une tension (oui mais / cependant) et une question.", ["papier_stylo"]),
    ex("philosophie", "philosophie-citation", "Apprendre une citation", 2, A(10), "Apprends une citation, puis explique-la en 4 lignes avec l'auteur.", ["papier_stylo"]),

    ...exercicesMatiere("economie", "économie", [VIDEO_COURS]),
    ex("economie", "economie-cinq-notions", "Définir 5 notions d'économie", 1, A(10), "Écris 5 notions du chapitre en une phrase chacune."),
    ex("economie", "economie-document-stat", "Analyser un document statistique", 2, A(15), "Lis un graphique ou un tableau : tendance, un chiffre, une réserve.", ["papier_stylo"]),

    ...exercicesMatiere("droit", "droit", [VIDEO_COURS]),
    ex("droit", "droit-fiche-arret", "Fiche d'arrêt", 3, A(20), "Fais une fiche d'arrêt : faits, procédure, problème, solution.", ["papier_stylo"]),
    ex("droit", "droit-syllogisme", "Syllogisme juridique", 2, A(15), "Écris majeure, mineure et conclusion sur un cas du cours.", ["papier_stylo"]),

    ...exercicesMatiere("management", "management", [VIDEO_COURS]),
    ex("management", "management-cas-swot", "Analyser un cas d'entreprise", 3, A(20), "Prends un cas du cours et remplis un outil (SWOT ou autre) en 4 cases.", ["papier_stylo"]),
    ex("management", "management-definir-outil", "Définir un outil de management", 2, A(10), "Choisis un outil du chapitre et explique en 5 lignes à quoi il sert."),

    ...exercicesMatiere("comptabilite", "comptabilité", [VIDEO_COURS]),
    ex("comptabilite", "comptabilite-cinq-ecritures", "Passer 5 écritures au journal", 2, A(15), "Passe 5 écritures au journal (débit / crédit) et vérifie que ça balance.", ["papier_stylo"]),
    ex("comptabilite", "comptabilite-bilan-simple", "Faire un bilan simplifié", 3, A(20), "Classe 8 postes en actif / passif et calcule le total des deux colonnes.", ["papier_stylo"]),
    ex("comptabilite", "comptabilite-tva", "Refaire une TVA", 2, A(10), "Calcule une TVA collectée, déductible et le montant à payer, puis vérifie.", ["papier_stylo"]),

    ...exercicesMatiere("gestion", "gestion", [VIDEO_COURS]),
    ex("gestion", "gestion-cout-revient", "Calculer un coût de revient", 3, A(15), "Calcule un coût de revient à partir des données du cours et écris le résultat unitaire.", ["papier_stylo"]),
    ex("gestion", "gestion-seuil-rentabilite", "Calculer un seuil de rentabilité", 3, A(15), "Calcule le seuil de rentabilité (charges fixes / marge) et dis en une phrase ce qu'il signifie.", ["papier_stylo"]),
  ],
};
