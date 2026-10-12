import type { Competence, Focus } from "../types";
import { A, ex } from "./outils";

// =============================================================
// Les autres domaines : même moteur, même logique.
// Un « focus » = un sous-thème de la compétence.
// Les missions sont courtes (5 à 20 min) : « peu mais souvent ».
// =============================================================

const f = (id: string, nom: string): Focus => ({ id, nom, recuperationJours: 0 });

// ---------------------------- FINANCE ----------------------------
export const educationFinanciere: Competence = {
  id: "education-financiere",
  nom: "Éducation financière",
  domaine: "Finance",
  focusParSeance: 1,
  focus: [
    f("budget", "Budget"),
    f("epargne", "Épargne"),
    f("investir", "Investissement"),
    f("interets", "Intérêts & inflation"),
    f("suivi", "Revoir ses finances"),
    f("culture-finance", "Se former (vidéos, podcasts, lectures)"),
  ],
  exercices: [
    ex("budget", "noter-depenses", "Noter ses dépenses d'hier", 1, A(5), "Liste chaque dépense d'hier et classe-la : besoin, envie, imprévu.", ["telephone"], "Note une seule dépense d'aujourd'hui."),
    ex("budget", "budget-mois", "Construire son budget du mois", 2, A(15, 2), "Revenus − charges fixes − variables = reste. Écris les 3 chiffres.", ["papier_stylo"]),
    ex("budget", "audit-abonnements", "Audit des abonnements", 2, A(10), "Liste tous tes prélèvements, entoure ceux que tu n'as pas utilisés ce mois-ci."),
    ex("budget", "regle-50-30-20", "Comparer son budget à la règle 50/30/20", 3, A(15), "Calcule ta part besoins / envies / épargne et note l'écart."),
    ex("epargne", "objectif-epargne", "Définir un objectif d'épargne", 1, A(10), "Montant, date, montant mensuel. Une seule ligne, chiffrée.", ["papier_stylo"], "Écris le montant que tu voudrais avoir de côté."),
    ex("epargne", "fonds-urgence", "Calculer son fonds d'urgence", 2, A(10), "3 mois de charges essentielles : combien ? Combien en as-tu ?"),
    ex("epargne", "comparer-livrets", "Comparer les livrets réglementés", 3, A(15), "Livret A, LDDS, LEP : taux, plafond, conditions. Lequel te correspond ?", ["ordinateur"]),
    ex("interets", "interets-composes", "Calculer des intérêts composés", 1, A(10), "50 €/mois à 4 % pendant 10 ans : calcule à la main ou avec un simulateur.", ["telephone"]),
    ex("interets", "inflation", "Comprendre l'inflation", 2, A(15), "Lis une explication et calcule ce que vaut 1 000 € dans 10 ans à 2 % d'inflation."),
    ex("investir", "action-cest-quoi", "Qu'est-ce qu'une action ?", 1, A(10), "Lis une explication simple et écris en 3 phrases ce qu'est une action et pourquoi son prix bouge.", ["aucun"], "Écris en une phrase ce qu'est une action."),
    ex("investir", "etf-vs-action", "ETF ou action individuelle ?", 2, A(15), "Écris 2 avantages et 2 risques de chacun, sans chercher à « choisir un gagnant »."),
    ex("investir", "diversification", "Comprendre la diversification", 3, A(15), "Explique en 5 lignes pourquoi on ne met pas tout sur un seul actif."),
    ex("investir", "lire-dici", "Lire un document d'information clé (DIC)", 4, A(20), "Prends le DIC d'un fonds : frais, indicateur de risque, horizon conseillé.", ["ordinateur"]),
    ex("suivi", "suivi-consulter-solde", "Consulter ses comptes", 1, A(5), "Ouvre tes comptes et note le solde de chacun sur une ligne.", ["telephone"], "Ouvre ton appli bancaire et regarde ton solde."),
    ex("suivi", "suivi-depenses-semaine", "Relire les dépenses de la semaine", 1, A(10), "Relis tes dépenses de la semaine et entoure 3 postes que tu aurais pu éviter."),
    ex("suivi", "suivi-revue-hebdo", "Revue hebdo de tes comptes", 2, A(15), "Note solde, dépenses par catégorie et l'écart avec ton budget, sans juger."),
    ex("suivi", "suivi-patrimoine", "Mettre à jour son suivi de patrimoine", 2, A(10), "Actualise tes soldes dans une app de suivi ou un tableur : c'est un état des lieux, pas un conseil.", ["telephone"], undefined, { type: "app", suggestions: ["Finary"] }),
    ex("suivi", "suivi-bilan-mois", "Bilan du mois", 3, A(20), "Écris revenus, dépenses, taux d'épargne et UNE décision pour le mois suivant."),
    ex("suivi", "suivi-traquer-frais", "Traquer les frais", 3, A(15), "Liste frais bancaires, abonnements et assurances, puis choisis UNE action pour en réduire un."),
    ex("suivi", "suivi-revue-trimestre", "Revue trimestrielle", 4, A(25), "Compare l'évolution de ton patrimoine sur 3 mois et ajuste un objectif, à toi de décider."),
    ex("culture-finance", "culture-video-3-idees", "Regarder une vidéo d'éducation financière", 1, A(12, 1), "Regarde une vidéo d'éducation financière et note 3 idées. C'est pour comprendre, pas pour copier un placement.", ["telephone"], "Regarde 3 minutes d'une vidéo finance et note une idée.", { type: "video", suggestions: ["Finary (YouTube)", "Heu?reka (YouTube)"] }),
    ex("culture-finance", "culture-podcast", "Écouter un podcast finance", 1, A(15), "Écoute un épisode pendant un trajet ou une marche et note une idée à vérifier.", ["telephone"], undefined, { type: "podcast", suggestions: ["Heu?reka", "La Martingale"] }),
    ex("culture-finance", "culture-video-fiche", "Vidéo puis mini-fiche", 2, A(15), "Après une vidéo : idée principale, un chiffre, une chose à vérifier par toi-même.", ["papier_stylo"], undefined, { type: "video", suggestions: ["Finary (YouTube)", "Heu?reka (YouTube)"] }),
    ex("culture-finance", "culture-article-actu", "Lire un article d'actualité éco", 2, A(10), "Lis un article et explique-le en 3 phrases, sans conclure à un achat.", ["telephone"], undefined, { type: "site", suggestions: ["Les Echos"] }),
    ex("culture-finance", "culture-comparer-videos", "Comparer deux avis sur un sujet", 3, A(20), "Compare deux vidéos ou avis sur le même sujet et note ce qui diffère."),
    ex("culture-finance", "culture-chapitre-livre", "Lire un chapitre de finance personnelle", 3, A(20), "Lis un chapitre et fais une fiche : 3 idées, 1 question encore ouverte.", ["aucun"], undefined, { type: "livre", suggestions: ["un livre de finance personnelle"] }),
    ex("culture-finance", "culture-verifier-source", "Vérifier une affirmation", 4, A(20), "Prends une affirmation vue en vidéo et recoupe-la avec une source officielle (AMF, Banque de France).", ["ordinateur"]),
  ],
};

// ----------------------- BUSINESS & CARRIÈRE -----------------------
export const marketingVente: Competence = {
  id: "marketing-vente",
  nom: "Marketing & vente",
  domaine: "Business & Carrière",
  focusParSeance: 1,
  focus: [f("marche", "Étude de marché"), f("offre", "Offre"), f("vente", "Vente"), f("contenu", "Contenu")],
  exercices: [
    ex("marche", "trois-concurrents", "Analyser 3 concurrents", 1, A(15, 2), "Prix, promesse, point faible de chacun dans un tableau.", ["telephone"], "Note le nom d'un concurrent et son prix."),
    ex("marche", "avis-clients", "Lire 10 avis clients négatifs", 2, A(15), "Chez un concurrent : note les 3 frustrations qui reviennent le plus."),
    ex("marche", "persona", "Décrire son client idéal", 2, A(15), "Âge, problème, ce qu'il a déjà essayé, ce qui le ferait acheter."),
    ex("offre", "promesse-une-phrase", "Écrire sa promesse en une phrase", 1, A(10), "« J'aide [qui] à [résultat] sans [douleur]. » Écris 3 versions."),
    ex("offre", "page-offre", "Rédiger la page d'une offre", 3, A(20), "Titre, problème, solution, preuve, prix, appel à l'action."),
    ex("vente", "produit-3-phrases", "Présenter son offre en 3 phrases", 1, A(5), "Pour qui, quel problème, quel résultat. À voix haute.", ["aucun"], "Dis ton offre en une phrase."),
    ex("vente", "pitch-2min", "Pitch de 2 minutes", 2, A(10), "Enregistre-toi au téléphone, réécoute, note une amélioration.", ["telephone"]),
    ex("vente", "objections", "Préparer les réponses aux objections", 3, A(15), "Liste 5 objections (prix, confiance…) et une réponse honnête pour chacune."),
    ex("contenu", "cinq-idees", "Noter 5 idées de contenu", 1, A(5), "Questions que ton client se pose : chacune est un sujet.", ["papier_stylo"], "Note une idée de contenu."),
    ex("contenu", "un-post", "Publier un contenu utile", 2, A(15), "Un conseil concret pour ton client idéal, sans vendre."),
    ex("contenu", "accroches", "Écrire 10 accroches", 3, A(10), "10 premières phrases différentes pour le même sujet. Garde la meilleure."),
  ],
};

// ------------------------------ SANTÉ ------------------------------
export const hygieneDeVie: Competence = {
  id: "hygiene-de-vie",
  nom: "Hygiène de vie",
  domaine: "Santé",
  focusParSeance: 1,
  focus: [f("sommeil", "Sommeil"), f("alimentation", "Alimentation"), f("hydratation", "Hydratation"), f("recuperation", "Récupération")],
  exercices: [
    ex("sommeil", "heure-coucher", "Fixer son heure de coucher", 1, A(5), "Choisis une heure réaliste et mets une alarme « au lit » 30 min avant.", ["telephone"], "Mets une alarme de coucher."),
    ex("sommeil", "ecran-off", "Écrans coupés 30 min avant de dormir", 2, A(30), "Téléphone hors de la chambre ou en mode avion. Lecture ou rangement à la place."),
    ex("sommeil", "routine-soir", "Écrire sa routine du soir", 2, A(10), "3 à 5 actions toujours dans le même ordre."),
    ex("alimentation", "repas-legumes", "Ajouter une portion de légumes", 1, A(10), "À un repas de la journée, sans rien changer d'autre.", ["aucun"], "Mange un fruit ou un légume aujourd'hui."),
    ex("alimentation", "preparer-repas", "Préparer un repas maison", 2, A(20), "Une protéine, un féculent, des légumes. Simple.", ["aucun"]),
    ex("alimentation", "liste-courses", "Faire sa liste de courses de la semaine", 2, A(15), "Planifie 3 repas à l'avance pour éviter de commander."),
    ex("hydratation", "bouteille", "Garder une bouteille d'eau à portée", 1, A(2), "Remplis-la le matin, finis-la avant le soir.", ["aucun"], "Bois un grand verre d'eau maintenant."),
    ex("recuperation", "pause-active", "Pause active toutes les 50 min", 1, A(5), "Lève-toi, marche, regarde au loin pendant 5 min."),
    ex("recuperation", "marche-digestive", "Marche après un repas", 2, A(10), "10 min de marche tranquille après le déjeuner ou le dîner."),
  ],
};

// ------------------------------ MENTAL ------------------------------
export const maitriseDeSoi: Competence = {
  id: "maitrise-de-soi",
  nom: "Maîtrise de soi",
  domaine: "Mental",
  focusParSeance: 1,
  focus: [f("concentration", "Concentration"), f("stress", "Gestion du stress"), f("confiance", "Confiance en soi"), f("decision", "Prise de décision")],
  exercices: [
    ex("concentration", "focus-10", "Session sans distraction", 1, A(10, 5), "Téléphone dans une autre pièce, une seule tâche, minuteur lancé.", ["aucun"], "2 min sur une seule tâche, téléphone retourné."),
    ex("concentration", "focus-25", "Pomodoro de 25 minutes", 3, A(25), "Une tâche, 25 min, note chaque distraction sur un papier sans la suivre."),
    ex("stress", "respiration-4-6", "Respiration 4-6", 1, A(3, 1), "Inspire 4 s, expire 6 s. Mains sur le ventre.", ["aucun"], "5 respirations lentes."),
    ex("stress", "vider-sa-tete", "Vider sa tête sur papier", 2, A(10), "Écris tout ce qui t'inquiète, puis entoure ce qui dépend de toi.", ["papier_stylo"]),
    ex("confiance", "trois-victoires", "Noter 3 victoires du jour", 1, A(5), "Même petites. Ce que tu as fait, pas ce que tu as ressenti.", ["papier_stylo"], "Note une chose réussie aujourd'hui."),
    ex("confiance", "zone-inconfort", "Une petite action inconfortable", 2, A(10), "Poser une question en public, demander un avis… note comment ça s'est passé."),
    ex("decision", "une-decision", "Prendre une petite décision en attente", 1, A(5), "Choisis, écris pourquoi en une ligne, et passe à autre chose.", ["papier_stylo"]),
    ex("decision", "pour-contre", "Décision : pour / contre / risque", 2, A(15), "Pour une décision en attente : 2 options, avantages, inconvénients, pire scénario."),
    ex("decision", "regle-10-10-10", "Règle 10/10/10", 3, A(10), "Qu'en penserai-je dans 10 minutes, 10 mois, 10 ans ?"),
  ],
};

// ---------------------- DISCIPLINE & PRODUCTIVITÉ ----------------------
export const passageAction: Competence = {
  id: "passage-action",
  nom: "Passage à l'action",
  domaine: "Discipline & Productivité",
  focusParSeance: 1,
  focus: [f("planification", "Planification"), f("demarrage", "Démarrage"), f("procrastination", "Anti-procrastination"), f("organisation", "Organisation")],
  exercices: [
    ex("planification", "trois-priorites", "Les 3 priorités de demain", 1, A(5), "Écris-les ce soir, dans l'ordre. La 1ère se fait avant tout le reste.", ["papier_stylo"], "Écris ta priorité n°1 de demain."),
    ex("planification", "revue-hebdo", "Revue de la semaine", 2, A(15), "Ce qui a marché, ce qui a bloqué, les 3 objectifs de la semaine prochaine."),
    ex("planification", "time-blocking", "Bloquer ses créneaux", 3, A(15), "Place tes tâches importantes dans l'agenda comme des rendez-vous.", ["telephone"]),
    ex("demarrage", "regle-2-min", "Règle des 2 minutes", 1, A(5), "Fais tout de suite 3 petites tâches qui prennent moins de 2 min.", ["aucun"], "Fais une tâche de moins de 2 min."),
    ex("demarrage", "premiere-etape", "Découper une tâche en étapes de 10 min", 2, A(10), "Prends une tâche floue, écris la toute première action visible."),
    ex("procrastination", "tache-repoussee", "Attaquer la tâche repoussée", 1, A(10, 5), "Celle que tu évites depuis des jours. Minuteur, juste commencer.", ["aucun"], "2 min sur la tâche repoussée."),
    ex("procrastination", "manger-grenouille", "La tâche la plus dure en premier", 3, A(25), "Avant les mails et les réseaux, dès le début de la journée."),
    ex("organisation", "espace-travail", "Préparer son espace de travail", 1, A(5), "Bureau vide, uniquement ce qui sert à la prochaine tâche."),
    ex("organisation", "inbox-zero", "Trier ses messages", 2, A(15), "Répondre, archiver ou planifier : rien ne reste « à voir »."),
  ],
};

// --------------------------- CONNAISSANCES ---------------------------
export const apprentissage: Competence = {
  id: "apprentissage",
  nom: "Apprentissage",
  domaine: "Connaissances",
  focusParSeance: 1,
  focus: [f("lecture", "Lecture"), f("langue", "Langue étrangère"), f("memoire", "Mémorisation"), f("esprit-critique", "Esprit critique")],
  exercices: [
    ex("lecture", "lire-10", "Lire 10 pages", 1, A(10, 3), "Puis écris en 1 phrase l'idée principale.", ["aucun"], "Lis une page."),
    ex("lecture", "fiche-chapitre", "Fiche d'un chapitre", 2, A(20), "3 idées clés + 1 action que tu vas appliquer."),
    ex("langue", "dix-mots", "Apprendre 10 mots", 1, A(10), "Avec des cartes ou une appli, puis fais une phrase avec 3 d'entre eux.", ["telephone"], "Apprends 3 mots."),
    ex("langue", "ecoute", "Écouter 10 min en VO", 2, A(10, 2), "Podcast ou vidéo, note 5 expressions nouvelles."),
    ex("langue", "parler-seul", "Parler 3 min dans la langue", 3, A(5, 1), "Raconte ta journée à voix haute en t'enregistrant.", ["telephone"]),
    ex("memoire", "rappel-actif", "Rappel actif", 1, A(10), "Ferme tes notes, écris tout ce dont tu te souviens, puis compare.", ["papier_stylo"]),
    ex("memoire", "feynman", "Méthode Feynman", 2, A(15), "Explique un concept comme à un enfant de 12 ans ; là où tu bloques, réapprends."),
    ex("esprit-critique", "fait-opinion", "Fait ou opinion ?", 1, A(10), "Dans un article ou une vidéo, souligne 3 faits et 3 opinions.", ["aucun"]),
    ex("esprit-critique", "verifier-info", "Vérifier une info vue en ligne", 2, A(10), "Trouve la source d'origine et une source indépendante.", ["ordinateur"]),
    ex("esprit-critique", "steelman", "Défendre l'avis opposé", 3, A(15), "Écris le meilleur argument du camp avec lequel tu n'es pas d'accord."),
  ],
};

// ------------------------------ SOCIAL ------------------------------
export const communication: Competence = {
  id: "communication",
  nom: "Communication",
  domaine: "Social",
  focusParSeance: 1,
  focus: [f("ecoute", "Écoute active"), f("oral", "Expression orale"), f("reseau", "Réseau"), f("assertivite", "Assertivité")],
  exercices: [
    ex("ecoute", "sans-interrompre", "Écouter sans interrompre", 1, A(10), "Dans une conversation, laisse finir et reformule avant de répondre.", ["aucun"], "Reformule ce que quelqu'un vient de te dire."),
    ex("ecoute", "trois-questions", "Poser 3 questions ouvertes", 2, A(10), "Commence par « comment », « qu'est-ce qui », « raconte-moi »."),
    ex("oral", "presenter-1min", "Te présenter en 1 minute", 1, A(5), "Enregistre-toi, compte les « euh », recommence une fois.", ["telephone"]),
    ex("oral", "expliquer-sujet", "Expliquer un sujet en 2 minutes", 2, A(10), "Structure : idée, exemple, conclusion. Debout, à voix haute."),
    ex("reseau", "reprendre-contact", "Reprendre contact avec quelqu'un", 1, A(5), "Un message sincère à une personne perdue de vue.", ["telephone"], "Envoie un message à un proche."),
    ex("reseau", "nouvelle-personne", "Parler à une nouvelle personne", 2, A(10), "Au travail, en cours ou à la salle : une vraie question."),
    ex("assertivite", "dire-non", "Dire non à une demande", 1, A(5), "Poliment, sans te justifier pendant 5 minutes."),
    ex("assertivite", "exprimer-besoin", "Exprimer un besoin clairement", 3, A(10), "Fait, ressenti, besoin, demande concrète."),
  ],
};

// -------------------------- VIE PERSONNELLE --------------------------
export const quotidien: Competence = {
  id: "quotidien",
  nom: "Organisation du quotidien",
  domaine: "Vie personnelle",
  focusParSeance: 1,
  focus: [f("rangement", "Rangement"), f("administratif", "Administratif"), f("creativite", "Créativité")],
  exercices: [
    ex("rangement", "dix-objets", "Ranger 10 objets", 1, A(5), "Remets 10 objets à leur place, chrono en main.", ["aucun"], "Range 3 objets."),
    ex("rangement", "une-zone", "Désencombrer une zone", 2, A(15), "Un tiroir ou une étagère : garder, donner, jeter."),
    ex("administratif", "classer-papiers", "Classer ses papiers", 1, A(10), "Un dossier « à traiter », un dossier « archivé »."),
    ex("administratif", "demarche", "Faire une démarche en attente", 2, A(15), "Le mail, le formulaire ou l'appel que tu repousses."),
    ex("creativite", "dix-idees", "Écrire 10 idées", 1, A(10), "Sur n'importe quel sujet, sans juger. La quantité d'abord.", ["papier_stylo"], "Écris 2 idées."),
    ex("creativite", "projet-creatif", "20 min de projet créatif", 2, A(15, 5), "Dessin, musique, écriture, vidéo… avance d'un pas."),
  ],
};
