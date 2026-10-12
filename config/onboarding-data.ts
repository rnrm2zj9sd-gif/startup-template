// THEMILION SYSTEM — Données de l'initiation (générées depuis la maquette Initiation)
// Banques fixes : objectifs, questions adaptatives, compétences, jalons, premières missions, options de temps.
// Aucune IA ici : tout est déterministe et construit à partir des réponses réelles de l'utilisateur.

export type GoalId = 'finance' | 'business' | 'physique' | 'sante' | 'mental' | 'discipline' | 'connaissances' | 'social' | 'vie';
export type Avatar = 'male' | 'female' | 'neutral';
export type TimeOptionId = 't1' | 't2' | 't3' | 't4' | 'custom';
export type Difficulty = 'Facile' | 'Standard' | 'Exigeante';
export type Scope = 'Réduit' | 'Normal' | 'Étendu';

export interface Goal { id: GoalId; title: string; description: string; headline: string; color: string; iconPath: string }
export interface Question { question: string; options: string[] }
export interface Skill { name: string; description: string }
export interface FirstMission { title: string; objective: string; skill: string; why: string }
export interface TimeOption { id: TimeOptionId; label: string; subLabel: string; maxMinutes: number; defaultMissionMinutes: number; averageMinutes: number; tag: string }

export const GOALS: Goal[] = [
  {
    "id": "finance",
    "title": "FINANCE",
    "description": "Mieux gérer ton argent, apprendre à investir, développer ton patrimoine.",
    "headline": "Maîtriser mes finances",
    "color": "#4ADE80",
    "iconPath": "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.4 4.5 3.2-2 3-4.5 3-4.5-1.3-4.5-3"
  },
  {
    "id": "business",
    "title": "BUSINESS & CARRIÈRE",
    "description": "Créer une entreprise, développer un projet, progresser professionnellement.",
    "headline": "Développer mon business",
    "color": "#A78BFA",
    "iconPath": "M3.5 8h17v11.5h-17zM8.5 8V5.5h7V8M3.5 13h17"
  },
  {
    "id": "physique",
    "title": "PHYSIQUE",
    "description": "Améliorer ta condition physique et tes performances sportives.",
    "headline": "Transformer mon physique",
    "color": "#FB7185",
    "iconPath": "M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"
  },
  {
    "id": "sante",
    "title": "SANTÉ",
    "description": "Adopter de meilleures habitudes de vie et mieux récupérer.",
    "headline": "Prendre soin de ma santé",
    "color": "#2DD4BF",
    "iconPath": "M3 12h4.5l2-4.5 4 9 2-4.5H21"
  },
  {
    "id": "mental",
    "title": "MENTAL",
    "description": "Renforcer ta concentration, ta confiance et ta gestion des difficultés.",
    "headline": "Renforcer mon mental",
    "color": "#648BFF",
    "iconPath": "M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"
  },
  {
    "id": "discipline",
    "title": "DISCIPLINE",
    "description": "Construire des habitudes durables et devenir régulier.",
    "headline": "Devenir plus discipliné",
    "color": "#E5E7EB",
    "iconPath": "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 11.5v1"
  },
  {
    "id": "connaissances",
    "title": "CONNAISSANCES",
    "description": "Apprendre de nouvelles compétences et élargir tes connaissances.",
    "headline": "Développer mes connaissances",
    "color": "#FDBA74",
    "iconPath": "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 21H20v-3"
  },
  {
    "id": "social",
    "title": "SOCIAL",
    "description": "Mieux communiquer et développer tes relations.",
    "headline": "Développer mes relations",
    "color": "#FBBF24",
    "iconPath": "M9 4.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.5.8 2.6 2.6 3 5.2"
  },
  {
    "id": "vie",
    "title": "VIE PERSONNELLE",
    "description": "Gagner en organisation et en autonomie au quotidien.",
    "headline": "Organiser ma vie",
    "color": "#F0ABFC",
    "iconPath": "M3 10.5 12 3l9 7.5M5.5 9v11.5h13V9M10 20.5v-6h4v6"
  }
];

/** 4 questions par objectif. La première sert à estimer le niveau de départ. */
export const QUESTIONS: Record<GoalId, Question[]> = {
  "finance": [
    {
      "question": "Quel est ton niveau actuel en finance ?",
      "options": [
        "Je débute complètement",
        "Je suis un budget",
        "J’épargne régulièrement",
        "J’investis déjà"
      ]
    },
    {
      "question": "Que veux-tu apprendre en priorité ?",
      "options": [
        "Gérer mon budget",
        "Épargner efficacement",
        "Investir sur le long terme",
        "Comprendre les marchés et le trading"
      ]
    },
    {
      "question": "Quel est ton objectif à moyen terme ?",
      "options": [
        "Ne plus être à découvert",
        "Avoir une épargne de sécurité",
        "Faire fructifier mon argent",
        "Créer un revenu complémentaire"
      ]
    },
    {
      "question": "Qu’est-ce qui te freine le plus ?",
      "options": [
        "Je dépense sans compter",
        "Je ne sais pas par où commencer",
        "Je manque de régularité",
        "J’ai peur de perdre de l’argent"
      ]
    }
  ],
  "business": [
    {
      "question": "As-tu déjà un projet ?",
      "options": [
        "Pas encore d’idée",
        "J’ai une idée",
        "Mon projet est lancé",
        "Mon activité génère des revenus"
      ]
    },
    {
      "question": "Où en es-tu actuellement ?",
      "options": [
        "Je me forme",
        "Je valide mon idée",
        "Je cherche mes premiers clients",
        "Je veux passer à l’échelle"
      ]
    },
    {
      "question": "Quelle est ta principale difficulté ?",
      "options": [
        "Trouver la bonne idée",
        "Trouver des clients",
        "M’organiser",
        "Rester motivé"
      ]
    },
    {
      "question": "Quel résultat veux-tu obtenir d’ici 6 mois ?",
      "options": [
        "Mon premier client",
        "Un revenu régulier",
        "Vivre de mon activité",
        "Développer une équipe"
      ]
    }
  ],
  "physique": [
    {
      "question": "Quel est ton niveau actuel ?",
      "options": [
        "Sédentaire",
        "Activité occasionnelle",
        "Sport régulier",
        "Niveau avancé"
      ]
    },
    {
      "question": "Quel est ton objectif principal ?",
      "options": [
        "Perdre du poids",
        "Prendre du muscle",
        "Améliorer mon endurance",
        "Être en forme au quotidien"
      ]
    },
    {
      "question": "Quel équipement as-tu à disposition ?",
      "options": [
        "Aucun",
        "Quelques accessoires",
        "Une salle de sport",
        "L’extérieur (course, vélo)"
      ]
    },
    {
      "question": "Combien de séances par semaine ?",
      "options": [
        "1 à 2",
        "3",
        "4 à 5",
        "Tous les jours"
      ]
    }
  ],
  "sante": [
    {
      "question": "Que veux-tu améliorer en premier ?",
      "options": [
        "Mon sommeil",
        "Mon alimentation",
        "Mon énergie",
        "Ma gestion du stress"
      ]
    },
    {
      "question": "Combien d’heures dors-tu par nuit ?",
      "options": [
        "Moins de 6 h",
        "6 à 7 h",
        "7 à 8 h",
        "Plus de 8 h"
      ]
    },
    {
      "question": "Comment décrirais-tu ton alimentation ?",
      "options": [
        "Désorganisée",
        "Correcte",
        "Équilibrée",
        "Très suivie"
      ]
    },
    {
      "question": "Qu’est-ce qui te freine ?",
      "options": [
        "Le manque de temps",
        "Le manque de connaissances",
        "Le manque de motivation",
        "Mes habitudes actuelles"
      ]
    }
  ],
  "mental": [
    {
      "question": "Sur quoi veux-tu travailler en priorité ?",
      "options": [
        "Ma concentration",
        "Ma confiance en moi",
        "Ma gestion du stress",
        "Ma résilience"
      ]
    },
    {
      "question": "Combien de temps restes-tu concentré sans distraction ?",
      "options": [
        "Moins de 10 min",
        "10 à 30 min",
        "30 à 60 min",
        "Plus d’une heure"
      ]
    },
    {
      "question": "Qu’est-ce qui te fait décrocher ?",
      "options": [
        "Mon téléphone",
        "La fatigue",
        "Les doutes",
        "Mon environnement"
      ]
    },
    {
      "question": "As-tu déjà une pratique ?",
      "options": [
        "Aucune",
        "Méditation",
        "Écriture d’un journal",
        "Sport"
      ]
    }
  ],
  "discipline": [
    {
      "question": "Quelle habitude veux-tu développer ?",
      "options": [
        "Me lever plus tôt",
        "Faire du sport",
        "Lire chaque jour",
        "Travailler sans distraction"
      ]
    },
    {
      "question": "Quelle est ta principale difficulté ?",
      "options": [
        "Je commence puis j’arrête",
        "Je procrastine",
        "Je manque de temps",
        "Je ne sais pas par où commencer"
      ]
    },
    {
      "question": "À quel moment es-tu le plus disponible ?",
      "options": [
        "Le matin",
        "Le midi",
        "Le soir",
        "C’est variable"
      ]
    },
    {
      "question": "Qu’est-ce qui t’empêche d’avancer ?",
      "options": [
        "Mon téléphone",
        "La fatigue",
        "Le manque de clarté",
        "Mon environnement"
      ]
    }
  ],
  "connaissances": [
    {
      "question": "Que veux-tu apprendre ?",
      "options": [
        "Une langue étrangère",
        "Une compétence numérique",
        "Réussir mes études",
        "Ma culture générale"
      ]
    },
    {
      "question": "Dans quel contexte ?",
      "options": [
        "Pour mes études",
        "Pour mon travail",
        "Par curiosité",
        "Pour un projet"
      ]
    },
    {
      "question": "Comment apprends-tu le mieux ?",
      "options": [
        "En lisant",
        "Avec des vidéos",
        "En pratiquant",
        "Avec un cours structuré"
      ]
    },
    {
      "question": "As-tu une échéance ?",
      "options": [
        "Aucune",
        "Dans 1 mois",
        "Dans 3 mois",
        "Dans 6 mois ou plus"
      ]
    }
  ],
  "social": [
    {
      "question": "Sur quoi veux-tu progresser ?",
      "options": [
        "Prendre la parole",
        "Élargir mon réseau",
        "Renforcer mes relations proches",
        "Mieux gérer les conflits"
      ]
    },
    {
      "question": "Es-tu à l’aise dans un groupe ?",
      "options": [
        "Pas du tout",
        "Un peu",
        "Plutôt",
        "Très à l’aise"
      ]
    },
    {
      "question": "Dans quel contexte ?",
      "options": [
        "Vie professionnelle",
        "Vie personnelle",
        "Les deux"
      ]
    },
    {
      "question": "À quelle fréquence vois-tu du monde ?",
      "options": [
        "Rarement",
        "Quelques fois par mois",
        "Chaque semaine",
        "Très souvent"
      ]
    }
  ],
  "vie": [
    {
      "question": "Quelle est ta priorité ?",
      "options": [
        "Mon organisation",
        "Mon logement",
        "Mes démarches administratives",
        "Mon autonomie"
      ]
    },
    {
      "question": "Utilises-tu un agenda ?",
      "options": [
        "Jamais",
        "Parfois",
        "Souvent",
        "Toujours"
      ]
    },
    {
      "question": "Qu’est-ce qui te prend le plus d’énergie ?",
      "options": [
        "Les tâches qui s’accumulent",
        "Les oublis",
        "Le manque de routine",
        "Les imprévus"
      ]
    },
    {
      "question": "Quel résultat souhaites-tu ?",
      "options": [
        "Un quotidien plus calme",
        "Gagner du temps",
        "Ne plus rien oublier",
        "Être autonome"
      ]
    }
  ]
};

export const SKILLS: Record<GoalId, Skill[]> = {
  "finance": [
    {
      "name": "Gestion budgétaire",
      "description": "Suivre tes dépenses pour reprendre le contrôle."
    },
    {
      "name": "Épargne",
      "description": "Mettre de côté chaque mois, même peu."
    },
    {
      "name": "Éducation financière",
      "description": "Comprendre les notions clés pour mieux décider."
    },
    {
      "name": "Investissement",
      "description": "Faire travailler ton argent sur le long terme."
    },
    {
      "name": "Marchés financiers",
      "description": "Comprendre la bourse et le fonctionnement des marchés."
    },
    {
      "name": "Gestion des risques",
      "description": "Protéger ton capital et limiter les pertes."
    },
    {
      "name": "Patrimoine",
      "description": "Construire et organiser ce que tu possèdes."
    },
    {
      "name": "Fiscalité personnelle",
      "description": "Comprendre tes impôts et les optimiser légalement."
    }
  ],
  "business": [
    {
      "name": "Entrepreneuriat",
      "description": "Passer de l’idée à un projet concret."
    },
    {
      "name": "Marketing",
      "description": "Comprendre ton marché et attirer des clients."
    },
    {
      "name": "Vente",
      "description": "Transformer l’intérêt en achat."
    },
    {
      "name": "Négociation",
      "description": "Défendre tes intérêts et conclure des accords."
    },
    {
      "name": "Gestion de projet",
      "description": "Planifier et livrer sans te disperser."
    },
    {
      "name": "Stratégie",
      "description": "Choisir où concentrer tes efforts."
    },
    {
      "name": "Leadership",
      "description": "Donner une direction et embarquer les autres."
    },
    {
      "name": "Communication professionnelle",
      "description": "Être clair et convaincant à l’écrit comme à l’oral."
    }
  ],
  "physique": [
    {
      "name": "Force",
      "description": "Gagner en puissance musculaire."
    },
    {
      "name": "Endurance",
      "description": "Tenir l’effort plus longtemps."
    },
    {
      "name": "Mobilité",
      "description": "Bouger librement et prévenir les blessures."
    },
    {
      "name": "Vitesse",
      "description": "Améliorer ta rapidité d’exécution."
    },
    {
      "name": "Coordination",
      "description": "Gagner en précision dans tes mouvements."
    },
    {
      "name": "Technique sportive",
      "description": "Maîtriser les gestes de ton sport."
    }
  ],
  "sante": [
    {
      "name": "Sommeil",
      "description": "Mieux dormir pour mieux récupérer."
    },
    {
      "name": "Nutrition",
      "description": "Manger de façon plus équilibrée."
    },
    {
      "name": "Hydratation",
      "description": "Boire suffisamment, chaque jour."
    },
    {
      "name": "Récupération",
      "description": "Laisser ton corps se régénérer."
    },
    {
      "name": "Gestion du stress",
      "description": "Faire baisser la pression au quotidien."
    },
    {
      "name": "Hygiène de vie",
      "description": "Installer des routines saines et durables."
    }
  ],
  "mental": [
    {
      "name": "Concentration",
      "description": "Rester focalisé sur une seule tâche."
    },
    {
      "name": "Confiance en soi",
      "description": "Croire en tes capacités et oser agir."
    },
    {
      "name": "Gestion des émotions",
      "description": "Comprendre et réguler tes réactions."
    },
    {
      "name": "Résilience",
      "description": "Rebondir après un échec."
    },
    {
      "name": "Pleine conscience",
      "description": "Être présent à ce que tu fais."
    },
    {
      "name": "Prise de décision",
      "description": "Choisir plus vite et plus sereinement."
    }
  ],
  "discipline": [
    {
      "name": "Gestion du temps",
      "description": "Utiliser tes heures pour ce qui compte."
    },
    {
      "name": "Planification",
      "description": "Préparer ta journée et ta semaine."
    },
    {
      "name": "Priorisation",
      "description": "Faire d’abord l’essentiel."
    },
    {
      "name": "Création d’habitudes",
      "description": "Installer des actions automatiques."
    },
    {
      "name": "Concentration",
      "description": "Travailler en profondeur, sans interruption."
    },
    {
      "name": "Régularité",
      "description": "Agir un peu, mais chaque jour."
    },
    {
      "name": "Réduction des distractions",
      "description": "Limiter ce qui te détourne de tes objectifs."
    }
  ],
  "connaissances": [
    {
      "name": "Méthodes d’apprentissage",
      "description": "Apprendre plus vite et retenir plus longtemps."
    },
    {
      "name": "Lecture",
      "description": "Lire régulièrement et en tirer l’essentiel."
    },
    {
      "name": "Mémorisation",
      "description": "Retenir durablement ce que tu apprends."
    },
    {
      "name": "Prise de notes",
      "description": "Structurer tes idées et tes connaissances."
    },
    {
      "name": "Langues",
      "description": "Progresser dans une langue étrangère."
    },
    {
      "name": "Compétences numériques",
      "description": "Maîtriser des outils utiles au quotidien."
    }
  ],
  "social": [
    {
      "name": "Prise de parole",
      "description": "T’exprimer avec aisance devant les autres."
    },
    {
      "name": "Écoute active",
      "description": "Comprendre vraiment ce que l’autre dit."
    },
    {
      "name": "Réseau",
      "description": "Rencontrer et garder le contact."
    },
    {
      "name": "Gestion des conflits",
      "description": "Désamorcer les tensions."
    },
    {
      "name": "Empathie",
      "description": "Te mettre à la place des autres."
    },
    {
      "name": "Aisance relationnelle",
      "description": "Te sentir à l’aise dans tes échanges."
    }
  ],
  "vie": [
    {
      "name": "Organisation",
      "description": "Savoir ce qui t’attend et quand le faire."
    },
    {
      "name": "Gestion administrative",
      "description": "Traiter tes démarches sans retard."
    },
    {
      "name": "Gestion du logement",
      "description": "Garder un lieu de vie ordonné."
    },
    {
      "name": "Cuisine du quotidien",
      "description": "Préparer des repas simples et sains."
    },
    {
      "name": "Autonomie",
      "description": "Gérer seul ton quotidien."
    },
    {
      "name": "Gestion de l’énergie",
      "description": "Répartir tes efforts sur la journée."
    }
  ]
};

export const MILESTONES: Record<GoalId, string[]> = {
  "finance": [
    "Faire le bilan de tes finances",
    "Construire ton budget mensuel",
    "Constituer une épargne de sécurité",
    "Apprendre les bases de l’investissement",
    "Mettre en place un premier placement"
  ],
  "business": [
    "Étudier ton marché et identifier un besoin client",
    "Définir ton offre",
    "Trouver tes premiers clients",
    "Structurer ton activité",
    "Développer tes revenus"
  ],
  "physique": [
    "Établir ton niveau de base",
    "Installer tes séances hebdomadaires",
    "Progresser sur tes exercices clés",
    "Atteindre ton premier objectif mesurable"
  ],
  "sante": [
    "Observer tes habitudes actuelles",
    "Stabiliser ton sommeil",
    "Améliorer ton alimentation",
    "Installer une routine de récupération"
  ],
  "mental": [
    "Identifier tes sources de distraction",
    "Allonger tes sessions de concentration",
    "Installer une pratique quotidienne",
    "Mieux gérer les situations de stress"
  ],
  "discipline": [
    "Choisir ton habitude clé",
    "Tenir 7 jours d’affilée",
    "Tenir 21 jours d’affilée",
    "Ajouter une deuxième habitude"
  ],
  "connaissances": [
    "Définir ton sujet et ton objectif",
    "Mettre en place ta méthode",
    "Pratiquer chaque jour",
    "Valider tes acquis"
  ],
  "social": [
    "Faire le point sur tes relations",
    "Créer une nouvelle interaction par semaine",
    "Prendre la parole en groupe",
    "Développer ton réseau"
  ],
  "vie": [
    "Faire l’inventaire de tes tâches",
    "Mettre en place ton agenda",
    "Installer une routine hebdomadaire",
    "Gagner en autonomie"
  ]
};

export const FIRST_MISSIONS: Record<GoalId, FirstMission> = {
  "finance": {
    "title": "FAIRE LE BILAN DE TES FINANCES",
    "objective": "Lister tes revenus et tes dépenses fixes du mois.",
    "skill": "Gestion budgétaire",
    "why": "Savoir où va ton argent est la base de toute décision financière."
  },
  "business": {
    "title": "ANALYSER SON MARCHÉ",
    "objective": "Identifier trois concurrents et comprendre leurs offres.",
    "skill": "Analyse de marché",
    "why": "Cette première action te permet de mieux comprendre ton marché avant de développer ton projet."
  },
  "physique": {
    "title": "ÉTABLIR TON NIVEAU DE BASE",
    "objective": "Réaliser un test simple (pompes, squats, gainage) et noter tes résultats.",
    "skill": "Force",
    "why": "Mesurer ton point de départ permet de suivre une progression réelle."
  },
  "sante": {
    "title": "OBSERVER TON SOMMEIL",
    "objective": "Noter ton heure de coucher, ton heure de réveil et ton énergie au réveil.",
    "skill": "Sommeil",
    "why": "On améliore ce que l’on mesure : ton sommeil influence tout le reste."
  },
  "mental": {
    "title": "SESSION DE CONCENTRATION",
    "objective": "Travailler sur une seule tâche, téléphone dans une autre pièce.",
    "skill": "Concentration",
    "why": "Une session sans distraction te montre ta vraie capacité de concentration."
  },
  "discipline": {
    "title": "CHOISIR TON HABITUDE CLÉ",
    "objective": "Définir une habitude, son moment précis, et la réaliser une première fois.",
    "skill": "Création d’habitudes",
    "why": "Une habitude claire et attachée à un moment précis a bien plus de chances de tenir."
  },
  "connaissances": {
    "title": "DÉFINIR TON SUJET D’APPRENTISSAGE",
    "objective": "Choisir ce que tu veux apprendre et trouver une ressource fiable.",
    "skill": "Méthodes d’apprentissage",
    "why": "Un objectif précis et une bonne ressource évitent de te disperser."
  },
  "social": {
    "title": "RECONNECTER",
    "objective": "Envoyer un message sincère à une personne que tu n’as pas contactée depuis longtemps.",
    "skill": "Aisance relationnelle",
    "why": "Les relations se construisent par de petites attentions régulières."
  },
  "vie": {
    "title": "VIDER TA TÊTE",
    "objective": "Lister toutes tes tâches en attente et choisir les trois plus importantes.",
    "skill": "Organisation",
    "why": "Mettre tes tâches par écrit libère de l’espace mental et clarifie tes priorités."
  }
};

export const TIME_OPTIONS: TimeOption[] = [
  {
    "id": "t1",
    "label": "5 à 10 min",
    "subLabel": "par jour",
    "maxMinutes": 10,
    "defaultMissionMinutes": 10,
    "averageMinutes": 8,
    "tag": "IDÉAL POUR DÉMARRER"
  },
  {
    "id": "t2",
    "label": "15 à 20 min",
    "subLabel": "par jour",
    "maxMinutes": 20,
    "defaultMissionMinutes": 15,
    "averageMinutes": 18,
    "tag": ""
  },
  {
    "id": "t3",
    "label": "30 min",
    "subLabel": "par jour",
    "maxMinutes": 30,
    "defaultMissionMinutes": 20,
    "averageMinutes": 30,
    "tag": ""
  },
  {
    "id": "t4",
    "label": "45 à 60 min",
    "subLabel": "par jour",
    "maxMinutes": 60,
    "defaultMissionMinutes": 30,
    "averageMinutes": 52,
    "tag": ""
  },
  {
    "id": "custom",
    "label": "Personnalisé",
    "subLabel": "ton propre rythme",
    "maxMinutes": 0,
    "defaultMissionMinutes": 0,
    "averageMinutes": 0,
    "tag": ""
  }
];

export const START_LEVELS = ['Débutant', 'Initié', 'Intermédiaire', 'Confirmé'] as const;

// ---------- Fonctions métier (même logique que la maquette) ----------

/** Clé d'une réponse : "<objectif>.<index de question>" → index de l'option choisie. */
export type Answers = Record<string, number>;
export const answerKey = (goal: GoalId, questionIndex: number) => `${goal}.${questionIndex}`;

/** Questions à poser : les 4 de l'objectif principal, puis la 1re de chaque objectif secondaire. */
export function buildQuestionList(primary: GoalId, secondary: GoalId[]) {
  return [
    ...QUESTIONS[primary].map((q, i) => ({ goal: primary, index: i, ...q })),
    ...secondary.map((g) => ({ goal: g, index: 0, ...QUESTIONS[g][0] })),
  ];
}

/** Niveau de départ estimé à partir de la première question de l'objectif. */
export function estimateStartLevel(goal: GoalId, answers: Answers): string {
  const a = answers[answerKey(goal, 0)];
  return a === undefined ? 'À découvrir' : START_LEVELS[Math.min(a, 3)];
}

/** Les 3 premières compétences de l'objectif principal sont recommandées (jamais cochées d'office). */
export const isRecommendedSkill = (goal: GoalId, primary: GoalId, skillIndex: number) => goal === primary && skillIndex < 3;

/** Jalons du parcours, avec variante pour un business sans idée de départ. */
export function buildMilestones(primary: GoalId, answers: Answers): string[] {
  const list = [...MILESTONES[primary]];
  if (primary === 'business' && answers[answerKey('business', 0)] === 0) list[0] = 'Trouver une idée qui répond à un vrai besoin';
  return list;
}

/** Durée maximale et durée par défaut de la première mission selon le temps disponible. */
export function missionDurationBounds(time: TimeOptionId, customMinutes = 25) {
  if (time === 'custom') {
    const c = Math.max(5, Math.min(180, customMinutes));
    return { max: c, default: Math.min(30, Math.max(5, Math.round((c * 0.7) / 5) * 5)) };
  }
  const t = TIME_OPTIONS.find((o) => o.id === time)!;
  return { max: t.maxMinutes, default: t.defaultMissionMinutes };
}

/** XP = durée × 1,5 × difficulté × périmètre, arrondi à 5 (20 min standard = 30 XP). */
export function missionXp(minutes: number, difficulty: Difficulty = 'Standard', scope: Scope = 'Normal'): number {
  const diff = { Facile: 0.8, Standard: 1, Exigeante: 1.3 }[difficulty];
  const sc = { Réduit: 0.8, Normal: 1, Étendu: 1.2 }[scope];
  return Math.max(5, Math.round((minutes * 1.5 * diff * sc) / 5) * 5);
}

/** Minutes estimées par semaine, pour l'aperçu du rythme. */
export function weeklyMinutes(time: TimeOptionId, days: number, customMinutes = 25): number {
  const perDay = time === 'custom' ? Math.max(5, Math.min(180, customMinutes)) : TIME_OPTIONS.find((o) => o.id === time)!.averageMinutes;
  return perDay * days;
}
