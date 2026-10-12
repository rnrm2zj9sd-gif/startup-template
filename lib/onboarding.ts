import {
  FIRST_MISSIONS,
  GOALS,
  SKILLS,
  START_LEVELS,
  TIME_OPTIONS,
  answerKey,
  estimateStartLevel,
  missionDurationBounds,
  type Answers,
  type GoalId,
  type TimeOptionId,
} from "@/config/onboarding-data";
import { CATALOGUE, calculerXP, type ChoixCompetence, type Materiel, type Profil } from "@/lib/moteur";

export const MAX_SECONDARY_GOALS = 2;
export const MAX_COMPETENCES_GRATUIT = 3;

/** Une entrée par skill d'initiation, dans l'ordre de `SKILLS`. */
const COMPETENCES_PAR_SKILL: Record<GoalId, string[]> = {
  finance: Array(8).fill("education-financiere"),
  business: [
    "marketing-vente",
    "marketing-vente",
    "marketing-vente",
    "marketing-vente",
    "passage-action",
    "marketing-vente",
    "communication",
    "communication",
  ],
  physique: ["musculation", "endurance", "mobilite", "endurance", "mobilite", "musculation"],
  sante: Array(6).fill("hygiene-de-vie"),
  mental: Array(6).fill("maitrise-de-soi"),
  discipline: Array(7).fill("passage-action"),
  connaissances: Array(6).fill("apprentissage"),
  social: Array(6).fill("communication"),
  vie: Array(6).fill("quotidien"),
};

export const skillKey = (goal: GoalId, index: number) => `${goal}.${index}`;

export const GOAL_COMPETENCE_DEFAUT: Record<GoalId, string> = {
  finance: "education-financiere",
  business: "marketing-vente",
  physique: "musculation",
  sante: "hygiene-de-vie",
  mental: "maitrise-de-soi",
  discipline: "passage-action",
  connaissances: "apprentissage",
  social: "communication",
  vie: "quotidien",
};

const NIVEAU_DEPART: Record<(typeof START_LEVELS)[number], 1 | 2 | 3 | 4> = {
  Débutant: 1,
  Initié: 2,
  Intermédiaire: 3,
  Confirmé: 4,
};

export interface InitiationState {
  primary: GoalId | null;
  secondary: GoalId[];
  answers: Answers;
  skillKeys: string[];
  time: TimeOptionId | null;
  customMinutes: number;
  days: number[];
}

export const initiationVide = (): InitiationState => ({
  primary: null,
  secondary: [],
  answers: {},
  skillKeys: [],
  time: null,
  customMinutes: 25,
  days: [0, 1, 2, 3, 4],
});

export function goalById(id: GoalId) {
  return GOALS.find((g) => g.id === id)!;
}

export function skillsPourObjectifs(primary: GoalId, secondary: GoalId[]) {
  return [primary, ...secondary].flatMap((goal) =>
    SKILLS[goal].map((skill, index) => ({ goal, index, ...skill })),
  );
}

export function competencesDepuisSkills(skillKeys: string[], primary: GoalId): string[] {
  const ids: string[] = [];
  for (const key of skillKeys) {
    const [goal, raw] = key.split(".");
    const index = Number(raw);
    const id = COMPETENCES_PAR_SKILL[goal as GoalId]?.[index] ?? GOAL_COMPETENCE_DEFAUT[primary];
    if (!ids.includes(id)) ids.push(id);
    if (ids.length >= MAX_COMPETENCES_GRATUIT) break;
  }
  if (!ids.length) ids.push(GOAL_COMPETENCE_DEFAUT[primary]);
  return ids;
}

function materielDepuisReponses(answers: Answers): Materiel[] {
  const equip = answers[answerKey("physique", 2)];
  const base: Materiel[] = ["aucun", "papier_stylo", "telephone"];
  if (equip === 1) return [...base, "elastique", "halteres"];
  if (equip === 2) return [...base, "halteres", "elastique", "barre_traction", "banc", "corde_a_sauter"];
  return base;
}

function seancesDepuisReponses(goal: GoalId, answers: Answers, days: number): number {
  if (goal === "physique") {
    const n = answers[answerKey("physique", 3)];
    if (n === 0) return 2;
    if (n === 1) return 3;
    if (n === 2) return 5;
    if (n === 3) return 7;
  }
  return Math.min(7, Math.max(1, days));
}

function niveauDepart(goal: GoalId, answers: Answers): 1 | 2 | 3 | 4 | 5 {
  const label = estimateStartLevel(goal, answers);
  if (label === "À découvrir") return 1;
  return NIVEAU_DEPART[label as (typeof START_LEVELS)[number]] ?? 1;
}

export function profilDepuisInitiation(state: InitiationState, userId: string): Profil {
  if (!state.primary || !state.time) throw new Error("Initiation incomplète.");
  const bounds = missionDurationBounds(state.time, state.customMinutes);
  const competenceIds = competencesDepuisSkills(state.skillKeys, state.primary);
  const days = state.days.length ? state.days : [0, 1, 2, 3, 4];
  const choix: ChoixCompetence[] = competenceIds
    .filter((competenceId) => CATALOGUE[competenceId])
    .map((competenceId) => {
      const goal = (Object.keys(GOAL_COMPETENCE_DEFAUT) as GoalId[]).find(
        (g) => GOAL_COMPETENCE_DEFAUT[g] === competenceId,
      );
      return {
        competenceId,
        focusIds: [],
        seancesParSemaine: seancesDepuisReponses(goal ?? state.primary!, state.answers, days.length),
        minutesMax: bounds.default,
        niveauDepart: niveauDepart(state.primary!, state.answers),
      };
    });

  return {
    userId,
    choix,
    materiel: materielDepuisReponses(state.answers),
    joursDisponibles: days,
    budgetMinutesJour: Math.max(15, bounds.max),
  };
}

export function xpPremiereMission(minutes: number): number {
  return calculerXP(minutes, 1, 0);
}

export function recapInitiation(state: InitiationState) {
  if (!state.primary || !state.time) return null;
  const bounds = missionDurationBounds(state.time, state.customMinutes);
  const time = TIME_OPTIONS.find((o) => o.id === state.time)!;
  return {
    goal: goalById(state.primary),
    level: estimateStartLevel(state.primary, state.answers),
    mission: FIRST_MISSIONS[state.primary],
    minutes: bounds.default,
    xp: xpPremiereMission(bounds.default),
    timeLabel: state.time === "custom" ? `${bounds.max} min` : time.label,
  };
}
