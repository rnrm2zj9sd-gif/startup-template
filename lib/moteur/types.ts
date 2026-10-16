// =============================================================
// THEMILION SYSTEM — Types du moteur de missions
// Le même modèle sert à TOUTES les compétences :
//   Domaine > Compétence > Focus (zone travaillée) > Exercices
//   ex. Physique > Musculation > Abdos > Gainage planche
//       Finance  > Éducation financière > Intérêts composés > Calcul sur 10 ans
// =============================================================

export type Materiel =
  | "aucun"
  | "halteres"
  | "barre_traction"
  | "elastique"
  | "banc"
  | "corde_a_sauter"
  | "papier_stylo"
  | "telephone"
  | "ordinateur";

/** Comment l'exercice se mesure. */
export type TypeDosage =
  | "repetitions" // ex. 3 séries de 12 pompes
  | "duree" // ex. 3 x 30 s de gainage
  | "action"; // ex. 15 min : lire un chapitre et le résumer

export interface Dosage {
  type: TypeDosage;
  series?: number; // repetitions / duree
  base: number; // reps, secondes ou minutes selon le type
  increment: number; // ajouté à chaque palier franchi
  reposSec?: number; // repos entre séries
}

export interface Exercice {
  id: string;
  nom: string;
  focusId: string;
  niveau: 1 | 2 | 3 | 4 | 5; // 1 = débutant
  materiel: Materiel[]; // tout ce qui est nécessaire
  dosage: Dosage;
  consigne: string; // une phrase claire, la technique ou l'action
  versionPlancher?: string; // version 2 minutes pour les mauvais jours
  /** Noms de chaînes, apps ou sites — jamais d'URL. */
  ressource?: {
    type: "video" | "podcast" | "article" | "livre" | "app" | "site";
    suggestions: string[];
  };
  perso?: boolean;
  epingle?: boolean;
}

export interface Focus {
  id: string;
  nom: string;
  /** Jours de repos minimum avant de retravailler ce focus (muscles : 1 à 2). */
  recuperationJours: number;
}

export interface Competence {
  id: string;
  nom: string;
  domaine: Domaine;
  /** Nombre de focus travaillés par séance (musculation : 2, lecture : 1…). */
  focusParSeance: number;
  /** Ajoute un échauffement automatique (sport). */
  echauffement?: string;
  focus: Focus[];
  exercices: Exercice[];
}

export type Domaine =
  | "Finance"
  | "Business & Carrière"
  | "Physique"
  | "Santé"
  | "Mental"
  | "Discipline & Productivité"
  | "Connaissances"
  | "Social"
  | "Vie personnelle"
  | "Études"
  | "Perso";

// ------------------------- Utilisateur -------------------------

/** Ce que l'utilisateur choisit dans l'app pour UNE compétence. */
export interface ChoixCompetence {
  competenceId: string;
  /** Les zones choisies (ex. ["abdos","epaules","bras","dos"]). Vide = toutes. */
  focusIds: string[];
  seancesParSemaine: number; // ex. 5
  minutesMax: number; // ex. 15 → « pas beaucoup »
  niveauDepart?: 1 | 2 | 3 | 4 | 5;
}

export interface Profil {
  userId: string;
  choix: ChoixCompetence[];
  materiel: Materiel[];
  /** Jours où l'utilisateur est dispo, 0 = lundi … 6 = dimanche. */
  joursDisponibles?: number[];
  /** Plafond total par jour, toutes compétences confondues. */
  budgetMinutesJour: number;
  catalogPerso?: CataloguePerso;
}

export type DifficultePerso = "facile" | "moyen" | "difficile"; // → niveau 1 / 2 / 3

export interface ExercicePerso {
  id: string;
  nom: string;
  competenceId: string;
  focusId: string;
  difficulte: DifficultePerso;
  mesure: "repetitions" | "duree" | "minutes";
  valeur: number;
  series?: number;
  consigne?: string;
  versionPlancher?: string;
  materiel?: Materiel[];
  progression: boolean;
  /** Lien https optionnel. Jamais interprété comme HTML. */
  lien?: string;
}

export interface FocusPerso {
  id: string;
  competenceId: string;
  nom: string;
  recuperationJours: number;
}

export interface CompetencePerso {
  id: string;
  nom: string;
  domaine: Domaine | "Perso";
  focusParSeance: number;
  focus: { id: string; nom: string; recuperationJours: number }[];
}

export interface CataloguePerso {
  competences: CompetencePerso[];
  focus: FocusPerso[];
  exercices: ExercicePerso[];
  epingles: string[];
  masques: string[];
}

export type Ressenti = "trop_facile" | "bien" | "trop_dur" | "pas_fait";

export interface ProgressionFocus {
  niveau: number; // 1..5
  palier: number; // 0..PALIERS_PAR_NIVEAU-1 (montée de volume dans le niveau)
}

export interface SeanceRealisee {
  date: string; // YYYY-MM-DD
  competenceId: string;
  focusIds: string[];
  exerciceIds: string[];
  ressenti: Ressenti;
}

export interface EtatUtilisateur {
  /** clé = `${competenceId}:${focusId}` */
  progression: Record<string, ProgressionFocus>;
  historique: SeanceRealisee[];
  chaineJours: number;
}

// --------------------------- Sorties ---------------------------

export interface ExercicePrescrit {
  exerciceId: string;
  nom: string;
  focus: string;
  prescription: string; // texte lisible : « 3 × 12 répétitions, 45 s de repos »
  consigne: string;
  minutes: number;
  ressource?: Exercice["ressource"];
  perso?: boolean;
}

export interface SeancePrevue {
  date: string;
  competenceId: string;
  competence: string;
  focusIds: string[];
  focusNoms: string[];
  echauffement?: string;
  exercices: ExercicePrescrit[];
  minutesTotal: number;
  xpEstime: number;
  missionPlancher: string;
}

export interface JourPlan {
  date: string;
  jour: string;
  seances: SeancePrevue[];
  minutesTotal: number;
}
