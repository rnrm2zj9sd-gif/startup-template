import { jourLocal } from "@/lib/temps";
import { calculerClasse } from "./classe";
import { CLASSE_FENETRE_JOURS, DISCIPLINE_JOURS, DOMAINE_AFFICHE, type DomaineAffiche } from "./config";
import { indiceDeDiscipline, type JourDiscipline } from "./discipline";
import { niveauDepuisXp, progressionVersNiveauSuivant, rangDepuisNiveau } from "./niveau";
import { calculerPower, niveauxDomainesDepuisXp, objectifValide } from "./power";
import type { ProgressionSnapshot } from "./types";

export type LedgerRow = {
  montant: number;
  domaine: string;
  created_at: string;
};

export type GoalRow = {
  id: string;
  statut: string;
};

export type MissionLite = {
  id: string;
  date_locale: string;
  type: string;
  statut: string;
  goal_id: string | null;
};

export function snapshotDepuisTables(input: {
  ledger: LedgerRow[];
  goals: GoalRow[];
  missions: MissionLite[];
  timezone: string;
  maintenant?: Date;
}): ProgressionSnapshot {
  const maintenant = input.maintenant ?? new Date();
  const tz = input.timezone || "Europe/Paris";
  const aujourdHui = jourLocal(maintenant, tz);

  const xpParDomaine = Object.fromEntries(DOMAINE_AFFICHE.map((d) => [d, 0])) as Record<DomaineAffiche, number>;
  let xpTotal = 0;
  const xp30j: Partial<Record<DomaineAffiche, number>> = {};
  const joursLedger = new Set<string>();

  const debut30 = decalerJour(aujourdHui, -(CLASSE_FENETRE_JOURS - 1));

  for (const row of input.ledger) {
    const montant = row.montant;
    xpTotal += montant;
    const domaine = DOMAINE_AFFICHE.includes(row.domaine as DomaineAffiche)
      ? (row.domaine as DomaineAffiche)
      : "life";
    xpParDomaine[domaine] += montant;
    const jour = jourLocal(new Date(row.created_at), tz);
    joursLedger.add(jour);
    if (jour >= debut30 && jour <= aujourdHui) {
      xp30j[domaine] = (xp30j[domaine] ?? 0) + montant;
    }
  }

  const termineesParGoal = new Map<string, number>();
  for (const m of input.missions) {
    if (m.statut === "terminee" && m.goal_id) {
      termineesParGoal.set(m.goal_id, (termineesParGoal.get(m.goal_id) ?? 0) + 1);
    }
  }

  let objectifsValides = 0;
  for (const g of input.goals) {
    if (g.statut === "termine" && objectifValide(termineesParGoal.get(g.id) ?? 0)) {
      objectifsValides += 1;
    }
  }

  const missionsValidees = input.missions.filter((m) => m.statut === "terminee").length;
  const niveauxDomaines = niveauxDomainesDepuisXp(xpParDomaine);
  const { niveau, xpDansNiveau, xpPourSuivant } = progressionVersNiveauSuivant(xpTotal);

  const parJour = new Map<string, JourDiscipline>();
  for (let i = DISCIPLINE_JOURS - 1; i >= 0; i--) {
    parJour.set(decalerJour(aujourdHui, -i), { prevues: 0, terminees: 0 });
  }
  for (const m of input.missions) {
    const jour = m.date_locale;
    const slot = parJour.get(jour);
    if (!slot) continue;
    const prevue = m.type === "daily" || m.type === "weekly" || m.type === "main";
    if (prevue) slot.prevues += 1;
    if (m.statut === "terminee") slot.terminees += 1;
  }

  return {
    xpTotal,
    niveau,
    xpDansNiveau,
    xpPourSuivant,
    rang: rangDepuisNiveau(niveau),
    power: calculerPower({ niveauxDomaines, objectifsValides }),
    classe: calculerClasse({ missionsValidees, xp30jParDomaine: xp30j }),
    discipline: indiceDeDiscipline([...parJour.values()]),
    chaineJours: chaineDepuisJours(joursLedger, aujourdHui),
    missionsValidees,
    xpParDomaine,
    niveauxDomaines,
  };
}

export function decalerJour(dateISO: string, n: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function chaineDepuisJours(jours: Set<string>, aujourdHui: string): number {
  let d = jours.has(aujourdHui) ? aujourdHui : decalerJour(aujourdHui, -1);
  let n = 0;
  while (jours.has(d)) {
    n += 1;
    d = decalerJour(d, -1);
  }
  return n;
}
