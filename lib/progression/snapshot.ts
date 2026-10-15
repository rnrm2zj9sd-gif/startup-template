import { jourLocal } from "@/lib/temps";
import { chaineDepuisJours } from "./chaine";
import { calculerClasse } from "./classe";
import { CLASSE_FENETRE_JOURS, DISCIPLINE_JOURS, DOMAINE_AFFICHE, type DomaineAffiche } from "./config";
import { indiceDeDiscipline } from "./discipline";
import { progressionVersNiveauSuivant, rangDepuisNiveau } from "./niveau";
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
  /** Mission reportée puis éventuellement faite. */
  reportee?: boolean;
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
  const sommeNiveaux = DOMAINE_AFFICHE.reduce((acc, d) => acc + niveauxDomaines[d], 0);

  const debutDiscipline = decalerJour(aujourdHui, -(DISCIPLINE_JOURS - 1));
  let prevues = 0;
  let tenues = 0;
  let reportees = 0;
  let reporteesFaites = 0;
  const joursActifs = new Set<string>();
  for (const m of input.missions) {
    if (m.date_locale < debutDiscipline || m.date_locale > aujourdHui) continue;
    const planifiee = m.type === "daily" || m.type === "weekly" || m.type === "main";
    if (planifiee) {
      prevues += 1;
      if (m.statut === "terminee") tenues += 1;
    }
    if (m.statut === "terminee") joursActifs.add(m.date_locale);
    if (m.reportee) {
      reportees += 1;
      if (m.statut === "terminee") reporteesFaites += 1;
    }
  }

  const disciplineInput = { prevues, tenues, joursActifs: joursActifs.size, reportees, reporteesFaites };
  const discipline = indiceDeDiscipline(disciplineInput);
  const fenetre = DISCIPLINE_JOURS;
  const partTenues = Math.round(60 * (prevues > 0 ? tenues / prevues : 0));
  const partActifs = Math.round(25 * (fenetre > 0 ? joursActifs.size / fenetre : 0));
  const partReports = Math.round(15 * (reportees > 0 ? reporteesFaites / reportees : 0));

  const parJour = new Map<string, number>();
  for (const row of input.ledger) {
    const jour = jourLocal(new Date(row.created_at), tz);
    parJour.set(jour, (parJour.get(jour) ?? 0) + row.montant);
  }
  const xpParJour = Array.from({ length: 30 }, (_, i) => {
    const date = decalerJour(aujourdHui, -(29 - i));
    return { date, xp: parJour.get(date) ?? 0 };
  });

  const power = calculerPower({ niveauxDomaines, objectifsValides });

  return {
    xpTotal,
    niveau,
    xpDansNiveau,
    xpPourSuivant,
    rang: rangDepuisNiveau(niveau),
    power,
    classe: calculerClasse({ missionsValidees, xp30jParDomaine: xp30j }),
    discipline,
    chaineJours: chaineDepuisJours(joursLedger),
    missionsValidees,
    xpParDomaine,
    niveauxDomaines,
    powerDetail: { sommeNiveaux, objectifsValides },
    disciplineDetail: {
      score: discipline,
      partTenues,
      partActifs,
      partReports,
      tenues,
      prevues,
      joursActifs: joursActifs.size,
      reportees,
      reporteesFaites,
    },
    xpParJour,
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
