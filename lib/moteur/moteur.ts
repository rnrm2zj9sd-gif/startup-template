// =============================================================
// THEMILION SYSTEM — Moteur de recommandation de missions
// Générique : fonctionne pour toutes les compétences du catalogue.
//
//  1. planifierSemaine()  → répartit les séances sur la semaine
//  2. choisirFocus()      → quelles zones aujourd'hui (rotation + récupération)
//  3. choisirExercices()  → quels exercices, adaptés au niveau et au matériel
//  4. doser()             → séries / reps / durée selon la progression
//  5. enregistrerResultat() → fait progresser (ou ralentit) selon le ressenti
// =============================================================

import { fusionnerCatalogue } from "./personnalisation";
import type {
  ChoixCompetence,
  Competence,
  EtatUtilisateur,
  Exercice,
  ExercicePrescrit,
  JourPlan,
  Profil,
  ProgressionFocus,
  Ressenti,
  SeancePrevue,
  SeanceRealisee,
} from "./types";

export const PALIERS_PAR_NIVEAU = 4; // 4 séances réussies ≈ un niveau de plus
const NIVEAU_MAX = 5;
const MINUTES_ECHAUFFEMENT = 2;
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// ------------------------- Outils -------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Aléatoire reproductible : même utilisateur + même jour = même séance. */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ajouterJours(dateISO: string, n: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ecartJours(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

/** 0 = lundi … 6 = dimanche */
function jourSemaine(dateISO: string): number {
  return (new Date(dateISO + "T00:00:00Z").getUTCDay() + 6) % 7;
}

export function lundiDe(dateISO: string): string {
  return ajouterJours(dateISO, -jourSemaine(dateISO));
}

const cle = (competenceId: string, focusId: string) => `${competenceId}:${focusId}`;

function progressionDe(etat: EtatUtilisateur, choix: ChoixCompetence, focusId: string): ProgressionFocus {
  return etat.progression[cle(choix.competenceId, focusId)] ?? { niveau: choix.niveauDepart ?? 1, palier: 0 };
}

// ------------------- 1. Planning de la semaine -------------------

/**
 * Répartit N séances sur les jours disponibles en les espaçant au maximum.
 * 5 séances sur 7 jours → Lun, Mar, Jeu, Ven, Dim (jamais 3 jours de repos d'affilée).
 */
export function joursDeSeance(n: number, joursDispo: number[] = [0, 1, 2, 3, 4, 5, 6]): number[] {
  const dispo = [...joursDispo].sort((a, b) => a - b);
  if (n >= dispo.length) return dispo;
  const choisis = new Set<number>();
  for (let i = 0; i < n; i++) choisis.add(dispo[Math.round((i * dispo.length) / n)]);
  return [...choisis].sort((a, b) => a - b);
}

// ------------------- 2. Choix des focus du jour -------------------

interface FocusChoisi {
  focusId: string;
  allege: boolean; // vrai si on n'a pas pu respecter la récupération → volume réduit
}

export function choisirFocus(
  competence: Competence,
  choix: ChoixCompetence,
  historique: SeanceRealisee[],
  date: string,
  alea: () => number,
  aDesExercices: (focusId: string) => boolean = () => true,
): FocusChoisi[] {
  // On ignore les zones sans exercice faisable (matériel manquant, niveau trop bas).
  const ids = (choix.focusIds.length ? choix.focusIds : competence.focus.map((f) => f.id)).filter(aDesExercices);
  const histo = historique.filter((s) => s.competenceId === competence.id && s.ressenti !== "pas_fait" && s.date < date);

  const candidats = ids.map((id) => {
    const focus = competence.focus.find((f) => f.id === id);
    if (!focus) throw new Error(`Focus inconnu « ${id} » pour ${competence.id}`);
    const passees = histo.filter((s) => s.focusIds.includes(id));
    const derniere = passees.at(-1)?.date;
    const depuis = derniere ? ecartJours(derniere, date) : 99;
    const cetteSemaine = passees.filter((s) => ecartJours(s.date, date) < 7).length;
    return {
      id,
      eligible: depuis > focus.recuperationJours,
      // On privilégie la zone la moins travaillée récemment.
      score: Math.min(depuis, 14) * 10 - cetteSemaine * 6 + alea() * 3,
    };
  });

  candidats.sort((a, b) => b.score - a.score);
  const nb = Math.min(competence.focusParSeance, candidats.length);
  const eligibles = candidats.filter((c) => c.eligible);
  const retenus: FocusChoisi[] = eligibles.slice(0, nb).map((c) => ({ focusId: c.id, allege: false }));
  // Pas assez de zones reposées (ex. 2 zones choisies pour 5 séances) : on complète en allégé.
  for (const c of candidats) {
    if (retenus.length >= nb) break;
    if (!retenus.some((r) => r.focusId === c.id)) retenus.push({ focusId: c.id, allege: true });
  }
  return retenus;
}

// ------------------- 3 & 4. Exercices et dosage -------------------

function doser(ex: Exercice, prog: ProgressionFocus, allege: boolean, plafondMin = Infinity): { texte: string; minutes: number } {
  const d = ex.dosage;
  // Un exercice d'un niveau inférieur se fait avec le volume maximum de son niveau.
  const palier = ex.niveau < prog.niveau ? PALIERS_PAR_NIVEAU - 1 : prog.palier;
  const quantite = d.base + palier * d.increment;
  const series = Math.max(1, (d.series ?? 1) - (allege ? 1 : 0));
  const repos = d.reposSec ?? 45;

  if (d.type === "repetitions") {
    const sec = series * quantite * 3 + (series - 1) * repos;
    return { texte: `${series} × ${quantite} répétitions · ${repos} s de repos`, minutes: Math.ceil(sec / 30) / 2 };
  }
  if (d.type === "duree") {
    const sec = series * quantite + (series - 1) * repos;
    return { texte: `${series} × ${quantite} s · ${repos} s de repos`, minutes: Math.ceil(sec / 30) / 2 };
  }
  // Une mission « action » s'adapte au temps dispo (jamais plus que le budget choisi).
  const minutes = Math.max(2, Math.min(plafondMin, allege ? Math.round(quantite * 0.6) : quantite));
  return { texte: `${minutes} min`, minutes };
}

function poolExercices(competence: Competence, focusId: string, niveau: number, materielDispo: Set<string>): Exercice[] {
  return competence.exercices.filter((e) => {
    if (e.focusId !== focusId) return false;
    if (!e.materiel.every((m) => m === "aucun" || materielDispo.has(m))) return false;
    // Perso / épinglé : toujours éligible (c'est l'utilisateur qui l'a choisi).
    if (e.perso || e.epingle) return true;
    return e.niveau <= niveau && e.niveau >= niveau - 2;
  });
}

/** Tirage pondéré : niveau actuel ×4, niveau -1 ×2, niveau -2 ×1 ; perso ×3 ; épinglé en premier. */
function tirer(pool: Exercice[], niveau: number, exclus: Set<string>, alea: () => number): Exercice | undefined {
  const epingles = pool.filter((e) => e.epingle);
  if (epingles.length) return epingles[0];
  const dispo = pool.filter((e) => e.epingle || !exclus.has(e.id));
  const liste = dispo.length ? dispo : pool;
  if (!liste.length) return undefined;
  const poids = liste.map((e) => {
    const base = [1, 2, 4][Math.max(0, 2 - (niveau - e.niveau))] ?? 1;
    return e.perso ? base * 3 : base;
  });
  let r = alea() * poids.reduce((a, b) => a + b, 0);
  for (let i = 0; i < liste.length; i++) {
    r -= poids[i];
    if (r <= 0) return liste[i];
  }
  return liste.at(-1);
}

// ------------------------------ XP ------------------------------

export function calculerXP(minutes: number, niveauMoyen: number, chaineJours: number): number {
  const base = Math.min(60, Math.max(5, minutes));
  const difficulte = niveauMoyen >= 4 ? 1.6 : niveauMoyen >= 3 ? 1.3 : 1.0;
  const engagement = 1.25; // séance prévue au contrat
  const chaine = Math.min(1.3, 1 + 0.02 * chaineJours);
  return Math.round(base * difficulte * engagement * chaine);
}

function validationsPerso(etat: EtatUtilisateur, exerciceId: string): number {
  return etat.historique.filter(
    (s) => s.exerciceIds.includes(exerciceId) && s.ressenti !== "trop_facile" && s.ressenti !== "pas_fait",
  ).length;
}

/**
 * XP anti-triche pour les exercices perso :
 *  - minutes comptées plafonnées à 30 ;
 *  - difficulté plafonnée à ×1,3 tant que l'exercice n'a pas 5 validations
 *    (ressenti autre que « trop facile ») ;
 *  - en fin de journée, l'XP perso ne peut pas dépasser 60 % de l'XP du jour
 *    (voir plafonnerXPPersoDuJour).
 */
function xpSeanceAvecPerso(
  exercices: ExercicePrescrit[],
  competence: Competence,
  etat: EtatUtilisateur,
  chaineJours: number,
  minutesEchauffement: number,
): { total: number; perso: number } {
  const officiels: ExercicePrescrit[] = [];
  const persos: ExercicePrescrit[] = [];
  for (const e of exercices) (e.perso ? persos : officiels).push(e);

  const minOff = officiels.reduce((a, e) => a + e.minutes, 0) + minutesEchauffement;
  const nivOff = officiels.map((e) => competence.exercices.find((x) => x.id === e.exerciceId)?.niveau ?? 1);
  const xpOff = minOff > 0 ? calculerXP(minOff, nivOff.reduce((a, b) => a + b, 0) / Math.max(1, nivOff.length), chaineJours) : 0;

  let xpPerso = 0;
  for (const e of persos) {
    const src = competence.exercices.find((x) => x.id === e.exerciceId);
    const minutes = Math.min(30, e.minutes);
    const niveauBrut = src?.niveau ?? 1;
    const niveau = validationsPerso(etat, e.exerciceId) >= 5 ? niveauBrut : Math.min(niveauBrut, 3);
    xpPerso += calculerXP(minutes, niveau, chaineJours);
  }
  return { total: xpOff + xpPerso, perso: xpPerso };
}

function plafonnerXPPersoDuJour(seances: SeancePrevue[], xpPersoParSeance: number[]): void {
  const total = seances.reduce((a, s) => a + s.xpEstime, 0);
  const perso = xpPersoParSeance.reduce((a, n) => a + n, 0);
  if (total <= 0 || perso <= 0 || perso <= 0.6 * total) return;
  const facteur = (0.6 * total) / perso;
  seances.forEach((s, i) => {
    const part = xpPersoParSeance[i] ?? 0;
    s.xpEstime = Math.round(s.xpEstime - part + part * facteur);
  });
}

function catalogueDuProfil(profil: Profil, catalogue: Record<string, Competence>): Record<string, Competence> {
  return profil.catalogPerso ? fusionnerCatalogue(catalogue, profil.catalogPerso) : catalogue;
}

// ------------------------ Séance complète ------------------------

export function genererSeance(
  profil: Profil,
  etat: EtatUtilisateur,
  catalogue: Record<string, Competence>,
  choix: ChoixCompetence,
  date: string,
  historique: SeanceRealisee[] = etat.historique,
  minutesDispo: number = choix.minutesMax,
): SeancePrevue {
  catalogue = catalogueDuProfil(profil, catalogue);
  const competence = catalogue[choix.competenceId];
  if (!competence) throw new Error(`Compétence inconnue : ${choix.competenceId}`);
  const alea = rng(`${profil.userId}|${choix.competenceId}|${date}`);
  const materiel = new Set<string>(profil.materiel);
  const focusDuJour = choisirFocus(competence, choix, historique, date, alea, (id) =>
    poolExercices(competence, id, progressionDe(etat, choix, id).niveau, materiel).length > 0,
  );

  let budget = minutesDispo - (competence.echauffement ? MINUTES_ECHAUFFEMENT : 0);
  const exercices: ExercicePrescrit[] = [];
  const pris = new Set<string>();

  // Exercices faits la dernière fois → on varie.
  const derniers = new Set(
    historique.filter((s) => s.competenceId === competence.id && s.date < date).slice(-2).flatMap((s) => s.exerciceIds),
  );

  // Tour par tour : 1 exercice par focus, puis on recommence tant que ça rentre dans le temps.
  let ajout = true;
  for (let tour = 0; ajout && tour < 4; tour++) {
    ajout = false;
    for (const f of focusDuJour) {
      const prog = progressionDe(etat, choix, f.focusId);
      const pool = poolExercices(competence, f.focusId, prog.niveau, materiel).filter((e) => !pris.has(e.id));
      // On ne garde que ce qui rentre dans le temps restant…
      let candidats = pool.filter((e) => doser(e, prog, f.allege, budget).minutes <= budget);
      // …sauf au 1er tour : chaque zone choisie doit avoir au moins un exercice (le plus court).
      if (!candidats.length && tour === 0 && pool.length) {
        candidats = [pool.reduce((a, b) => (doser(a, prog, f.allege, budget).minutes <= doser(b, prog, f.allege, budget).minutes ? a : b))];
      }
      const ex = tirer(candidats, prog.niveau, derniers, alea);
      if (!ex) continue;
      const dose = doser(ex, prog, f.allege, budget);
      pris.add(ex.id);
      budget -= dose.minutes;
      ajout = true;
      exercices.push({
        exerciceId: ex.id,
        nom: ex.nom,
        focus: competence.focus.find((x) => x.id === f.focusId)!.nom + (f.allege ? " (allégé)" : ""),
        prescription: dose.texte,
        consigne: ex.consigne,
        minutes: dose.minutes,
        ressource: ex.ressource,
        perso: ex.perso,
      });
    }
  }

  const minutesEchauffement = competence.echauffement ? MINUTES_ECHAUFFEMENT : 0;
  const minutesTotal = exercices.reduce((a, e) => a + e.minutes, 0) + minutesEchauffement;
  const { total: xpEstime } = xpSeanceAvecPerso(exercices, competence, etat, etat.chaineJours, minutesEchauffement);
  const premier = competence.exercices.find((x) => x.id === exercices[0]?.exerciceId);

  return {
    date,
    competenceId: competence.id,
    competence: competence.nom,
    focusIds: focusDuJour.map((f) => f.focusId),
    focusNoms: focusDuJour.map((f) => competence.focus.find((x) => x.id === f.focusId)!.nom),
    echauffement: competence.echauffement,
    exercices,
    minutesTotal,
    xpEstime,
    missionPlancher: premier?.versionPlancher ?? `2 minutes de « ${premier?.nom ?? competence.nom} » pour garder la chaîne.`,
  };
}

/** Mode libre : seulement la mission plancher de 2 minutes. */
export function genererPlancher(
  profil: Profil,
  etat: EtatUtilisateur,
  catalogue: Record<string, Competence>,
  choix: ChoixCompetence,
  date: string,
): SeancePrevue {
  catalogue = catalogueDuProfil(profil, catalogue);
  const competence = catalogue[choix.competenceId];
  if (!competence) throw new Error(`Compétence inconnue : ${choix.competenceId}`);
  const focusId = choix.focusIds[0] ?? competence.focus[0]?.id;
  const pool = competence.exercices.filter((e) => !focusId || e.focusId === focusId);
  const ex = pool.find((e) => e.versionPlancher) ?? pool[0] ?? competence.exercices[0];
  const focusNom = competence.focus.find((f) => f.id === (ex?.focusId ?? focusId))?.nom ?? competence.nom;
  const exercices: ExercicePrescrit[] = ex
    ? [
        {
          exerciceId: ex.id,
          nom: ex.nom,
          focus: focusNom,
          prescription: "2 min",
          consigne: ex.versionPlancher ?? `2 minutes de « ${ex.nom} » pour garder la chaîne.`,
          minutes: 2,
          ressource: ex.ressource,
          perso: ex.perso,
        },
      ]
    : [];
  return {
    date,
    competenceId: competence.id,
    competence: competence.nom,
    focusIds: ex ? [ex.focusId] : focusId ? [focusId] : [],
    focusNoms: [focusNom],
    exercices,
    minutesTotal: 2,
    xpEstime: calculerXP(2, ex?.niveau ?? 1, etat.chaineJours),
    missionPlancher: ex?.versionPlancher ?? `2 minutes de « ${ex?.nom ?? competence.nom} » pour garder la chaîne.`,
  };
}

/** Mixte : au moins un exercice épinglé par semaine pour chaque zone travaillée. */
function assurerEpinglesSemaine(plan: JourPlan[], profil: Profil, catalogue: Record<string, Competence>): void {
  for (const choix of profil.choix) {
    if ((choix.mode ?? "guide") !== "mixte") continue;
    const competence = catalogue[choix.competenceId];
    if (!competence) continue;
    const pins = competence.exercices.filter((e) => e.epingle);
    if (!pins.length) continue;
    const seances = plan.flatMap((j) => j.seances.filter((s) => s.competenceId === choix.competenceId));
    const focusTravailles = new Set(seances.flatMap((s) => s.focusIds));
    for (const focusId of focusTravailles) {
      const pinsZone = pins.filter((e) => e.focusId === focusId);
      if (!pinsZone.length) continue;
      const deja = seances.some((s) => s.exercices.some((x) => pinsZone.some((p) => p.id === x.exerciceId)));
      if (deja) continue;
      const cible = seances.find((s) => s.focusIds.includes(focusId));
      if (!cible) continue;
      const pin = pinsZone[0];
      const focusNom = competence.focus.find((f) => f.id === focusId)?.nom ?? focusId;
      const prescrit: ExercicePrescrit = {
        exerciceId: pin.id,
        nom: pin.nom,
        focus: focusNom,
        prescription: "épinglé",
        consigne: pin.consigne,
        minutes: Math.max(2, cible.exercices[0]?.minutes ?? 5),
        ressource: pin.ressource,
        perso: pin.perso,
      };
      const idx = cible.exercices.findIndex((x) => {
        const src = competence.exercices.find((e) => e.id === x.exerciceId);
        return src?.focusId === focusId;
      });
      if (idx >= 0) cible.exercices[idx] = prescrit;
      else cible.exercices.unshift(prescrit);
    }
  }
}

// ------------------------ Plan de la semaine ------------------------

export function planifierSemaine(
  profil: Profil,
  etat: EtatUtilisateur,
  catalogue: Record<string, Competence>,
  dateDansLaSemaine: string,
): JourPlan[] {
  catalogue = catalogueDuProfil(profil, catalogue);
  const lundi = lundiDe(dateDansLaSemaine);
  const joursParChoix = profil.choix.map((c) => joursDeSeance(c.seancesParSemaine, profil.joursDisponibles));
  // Les séances prévues comptent comme « faites » pour faire tourner les zones dans la semaine.
  const histoVirtuel: SeanceRealisee[] = [...etat.historique];
  const plan: JourPlan[] = [];

  for (let j = 0; j < 7; j++) {
    const date = ajouterJours(lundi, j);
    const duJour = profil.choix.filter((_, i) => joursParChoix[i].includes(j));
    const seances: SeancePrevue[] = [];
    let reste = profil.budgetMinutesJour;

    duJour.forEach((choix, i) => {
      if ((choix.mode ?? "guide") === "libre") {
        const s = genererPlancher(profil, etat, catalogue, choix, date);
        seances.push(s);
        reste -= s.minutesTotal;
        histoVirtuel.push({
          date,
          competenceId: s.competenceId,
          focusIds: s.focusIds,
          exerciceIds: s.exercices.map((e) => e.exerciceId),
          ressenti: "bien",
        });
        return;
      }
      // Partage équitable du budget du jour entre les compétences restantes.
      const part = Math.floor(reste / (duJour.length - i));
      const minutes = Math.min(choix.minutesMax, part);
      if (minutes < 3) return; // pas la place aujourd'hui
      const s = genererSeance(profil, etat, catalogue, choix, date, histoVirtuel, minutes);
      seances.push(s);
      reste -= s.minutesTotal;
      histoVirtuel.push({ date, competenceId: s.competenceId, focusIds: s.focusIds, exerciceIds: s.exercices.map((e) => e.exerciceId), ressenti: "bien" });
    });

    const xpPerso = seances.map((s) => {
      const competence = catalogue[s.competenceId];
      return competence
        ? xpSeanceAvecPerso(s.exercices, competence, etat, etat.chaineJours, s.echauffement ? MINUTES_ECHAUFFEMENT : 0).perso
        : 0;
    });
    plafonnerXPPersoDuJour(seances, xpPerso);

    plan.push({ date, jour: JOURS[j], seances, minutesTotal: seances.reduce((a, s) => a + s.minutesTotal, 0) });
  }
  assurerEpinglesSemaine(plan, profil, catalogue);
  return plan;
}

/** Ce que l'app affiche le matin : les séances d'aujourd'hui. */
export function seancesDuJour(profil: Profil, etat: EtatUtilisateur, catalogue: Record<string, Competence>, date: string): JourPlan {
  return planifierSemaine(profil, etat, catalogue, date).find((j) => j.date === date)!;
}

// ------------------------ 5. Progression ------------------------

/**
 * Enregistre le ressenti de l'utilisateur et fait évoluer chaque zone travaillée.
 *  - « trop facile » : +2 paliers   - « bien » : +1 palier
 *  - « trop dur »    : -1 palier (et redescend d'un niveau si besoin)
 *  - « pas fait »    : rien ne bouge, seule la chaîne est affectée
 * Tous les 4 paliers → niveau supérieur → exercices plus durs.
 */
export function enregistrerResultat(etat: EtatUtilisateur, seance: SeancePrevue, ressenti: Ressenti, niveauDepart = 1): EtatUtilisateur {
  const progression = { ...etat.progression };
  const delta = { trop_facile: 2, bien: 1, trop_dur: -1, pas_fait: 0 }[ressenti];

  for (const focusId of seance.focusIds) {
    const k = cle(seance.competenceId, focusId);
    let { niveau, palier } = progression[k] ?? { niveau: niveauDepart, palier: 0 };
    palier += delta;
    while (palier >= PALIERS_PAR_NIVEAU) {
      if (niveau >= NIVEAU_MAX) { palier = PALIERS_PAR_NIVEAU - 1; break; }
      niveau++;
      palier -= PALIERS_PAR_NIVEAU;
    }
    if (palier < 0) {
      if (niveau > 1) { niveau--; palier = PALIERS_PAR_NIVEAU - 2; } else palier = 0;
    }
    progression[k] = { niveau, palier };
  }

  // Chaîne « qui se fissure » : 1 jour manqué = conservée, 2+ = divisée par deux.
  let chaine = etat.chaineJours;
  if (ressenti !== "pas_fait") {
    const derniere = etat.historique.filter((s) => s.ressenti !== "pas_fait").at(-1)?.date;
    const ecart = derniere ? ecartJours(derniere, seance.date) : 1;
    if (ecart === 0) { /* déjà comptée aujourd'hui */ }
    else if (ecart <= 2) chaine += 1;
    else chaine = Math.floor(chaine / 2) + 1;
  }

  return {
    progression,
    chaineJours: chaine,
    historique: [
      ...etat.historique,
      { date: seance.date, competenceId: seance.competenceId, focusIds: seance.focusIds, exerciceIds: seance.exercices.map((e) => e.exerciceId), ressenti },
    ],
  };
}

export const etatInitial = (): EtatUtilisateur => ({ progression: {}, historique: [], chaineJours: 0 });
