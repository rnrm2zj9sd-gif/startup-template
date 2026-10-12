import type { Attribute, AttributeKey, DayStatus, StreakDay } from "@/config/dashboard";
import { Brain, Dumbbell, Users, Wallet } from "lucide-react";
import { CATALOGUE, lundiDe, type Domaine, type EtatUtilisateur, type JourPlan, type Materiel, type Ressenti, type SeancePrevue } from ".";

const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export const MATERIEL_LABELS: Record<Materiel, string> = {
  aucun: "Corps seulement",
  halteres: "Haltères",
  barre_traction: "Barre de traction",
  elastique: "Élastique",
  banc: "Banc",
  corde_a_sauter: "Corde à sauter",
  papier_stylo: "Papier et stylo",
  telephone: "Téléphone",
  ordinateur: "Ordinateur",
};

export const RESSENTI_LABELS: Record<Ressenti, string> = {
  trop_facile: "Trop facile",
  bien: "Bien",
  trop_dur: "Trop dur",
  pas_fait: "Pas fait",
};

const DOMAINE_VERS_ATTRIBUT: Record<Domaine, AttributeKey> = {
  Finance: "finance",
  "Business & Carrière": "finance",
  Physique: "physique",
  Santé: "physique",
  Mental: "mental",
  "Discipline & Productivité": "mental",
  Connaissances: "mental",
  Social: "social",
  "Vie personnelle": "social",
  Études: "mental",
  Perso: "mental",
};

const ATTRIBUT_META: Record<AttributeKey, { label: string; icon: Attribute["icon"] }> = {
  finance: { label: "Finance", icon: Wallet },
  physique: { label: "Physique", icon: Dumbbell },
  mental: { label: "Mental", icon: Brain },
  social: { label: "Social", icon: Users },
};

/** Date locale YYYY-MM-DD (le moteur lit la date, pas le fuseau). */
export function aujourdHuiISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function domaineDe(competenceId: string): Domaine | undefined {
  return CATALOGUE[competenceId]?.domaine;
}

export function attributDe(competenceId: string): AttributeKey {
  const domaine = domaineDe(competenceId);
  return domaine ? DOMAINE_VERS_ATTRIBUT[domaine] : "mental";
}

export function labelAttribut(competenceId: string): string {
  return ATTRIBUT_META[attributDe(competenceId)].label;
}

export function cleSeance(seance: Pick<SeancePrevue, "date" | "competenceId">): string {
  return `${seance.date}:${seance.competenceId}`;
}

export function ressentiSeance(
  etat: EtatUtilisateur,
  seance: Pick<SeancePrevue, "date" | "competenceId">
): Ressenti | undefined {
  return [...etat.historique]
    .reverse()
    .find((s) => s.date === seance.date && s.competenceId === seance.competenceId)?.ressenti;
}

export function seanceTerminee(etat: EtatUtilisateur, seance: Pick<SeancePrevue, "date" | "competenceId">): boolean {
  const ressenti = ressentiSeance(etat, seance);
  return ressenti !== undefined && ressenti !== "pas_fait";
}

export function seanceEnregistree(etat: EtatUtilisateur, seance: Pick<SeancePrevue, "date" | "competenceId">): boolean {
  return ressentiSeance(etat, seance) !== undefined;
}

export function attributsDepuisEtat(etat: EtatUtilisateur, semaine: JourPlan[], today: string): Attribute[] {
  const parAttribut: Record<AttributeKey, { scores: number[]; weekly: number }> = {
    finance: { scores: [], weekly: 0 },
    physique: { scores: [], weekly: 0 },
    mental: { scores: [], weekly: 0 },
    social: { scores: [], weekly: 0 },
  };

  for (const [cle, prog] of Object.entries(etat.progression)) {
    const competenceId = cle.split(":")[0];
    const key = attributDe(competenceId);
    parAttribut[key].scores.push(Math.min(100, prog.niveau * 16 + prog.palier * 4));
  }

  const lundi = lundiDe(today);
  for (const s of etat.historique) {
    if (s.date < lundi || s.date > today) continue;
    if (s.ressenti === "pas_fait") continue;
    parAttribut[attributDe(s.competenceId)].weekly += 1;
  }

  return (Object.keys(ATTRIBUT_META) as AttributeKey[]).map((key) => {
    const pack = parAttribut[key];
    const value = pack.scores.length
      ? Math.round(pack.scores.reduce((a, b) => a + b, 0) / pack.scores.length)
      : 8;
    return {
      key,
      label: ATTRIBUT_META[key].label,
      icon: ATTRIBUT_META[key].icon,
      value,
      weeklyDelta: pack.weekly,
    };
  });
}

export function semaineSerie(semaine: JourPlan[], etat: EtatUtilisateur, today: string): StreakDay[] {
  return semaine.map((jour, i) => {
    const prevues = jour.seances;
    const faites = prevues.filter((s) => seanceTerminee(etat, s)).length;
    let status: DayStatus;

    if (jour.date > today) status = "upcoming";
    else if (jour.date === today) status = faites === prevues.length && prevues.length > 0 ? "done" : "today";
    else if (prevues.length === 0) status = "done";
    else if (faites > 0) status = "done";
    else status = "missed";

    return { label: JOURS_COURTS[i], status };
  });
}
