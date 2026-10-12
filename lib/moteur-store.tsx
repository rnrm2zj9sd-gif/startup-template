"use client";

import { emptyMoteurProfil } from "@/config/moteur-demo";
import {
  CATALOGUE,
  enregistrerResultat,
  etatInitial,
  planifierSemaine,
  type EtatUtilisateur,
  type Profil,
  type Ressenti,
  type SeancePrevue,
} from "@/lib/moteur";
import { aujourdHuiISO, seanceEnregistree } from "@/lib/moteur/app";
import { useProfile } from "@/lib/profile-store";
import { getRank, XP_STEP_PER_LEVEL } from "@/lib/system";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "themilion:moteur";

interface MoteurPersiste {
  profil: Profil;
  etat: EtatUtilisateur;
  meilleureChaine: number;
}

interface MoteurContextValue {
  profil: Profil;
  etat: EtatUtilisateur;
  meilleureChaine: number;
  today: string;
  hydrated: boolean;
  updateProfil: (patch: Partial<Profil> | ((prev: Profil) => Profil)) => void;
  appliquerContrat: (profil: Profil, etat?: EtatUtilisateur) => void;
  terminerSeance: (seance: SeancePrevue, ressenti: Ressenti) => void;
}

const MoteurContext = createContext<MoteurContextValue | null>(null);

/**
 * État du moteur de missions (choix, historique, chaîne).
 * Persisté en localStorage. L'XP gagnée remonte dans le profil joueur.
 */
export function MoteurProvider({ children }: { children: ReactNode }) {
  const { updateProfile } = useProfile();
  const [profil, setProfil] = useState<Profil>(emptyMoteurProfil);
  const [etat, setEtat] = useState<EtatUtilisateur>(etatInitial);
  const [meilleureChaine, setMeilleureChaine] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const today = aujourdHuiISO();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<MoteurPersiste>;
        if (saved.profil && saved.profil.userId !== "demo-willy") {
          setProfil({ ...emptyMoteurProfil, ...saved.profil });
        }
        if (saved.etat) setEtat({ ...etatInitial(), ...saved.etat });
        if (typeof saved.meilleureChaine === "number") setMeilleureChaine(saved.meilleureChaine);
      }
    } catch {
      // Stockage indisponible : profil de démo.
    }
    setHydrated(true);
  }, []);

  const persister = useCallback((next: MoteurPersiste) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Session seulement.
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persister({ profil, etat, meilleureChaine });
  }, [etat, hydrated, meilleureChaine, persister, profil]);

  const updateProfil = useCallback((patch: Partial<Profil> | ((prev: Profil) => Profil)) => {
    setProfil((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const appliquerContrat = useCallback((next: Profil, nextEtat: EtatUtilisateur = etatInitial()) => {
    setProfil(next);
    setEtat(nextEtat);
    setMeilleureChaine(0);
  }, []);

  const terminerSeance = useCallback(
    (seance: SeancePrevue, ressenti: Ressenti) => {
      if (seanceEnregistree(etat, seance)) return;
      const nextEtat = enregistrerResultat(etat, seance, ressenti);
      const nextBest = Math.max(meilleureChaine, nextEtat.chaineJours);
      setEtat(nextEtat);
      setMeilleureChaine(nextBest);

      if (ressenti !== "pas_fait" && seance.xpEstime > 0) {
        updateProfile((prev) => {
          let xp = prev.xp + seance.xpEstime;
          let level = prev.level;
          let xpNext = prev.xpNext;
          while (xp >= xpNext) {
            xp -= xpNext;
            level += 1;
            xpNext += XP_STEP_PER_LEVEL;
          }
          return { ...prev, xp, level, xpNext, rank: getRank(level) };
        });
      }
    },
    [etat, meilleureChaine, updateProfile]
  );

  const value = useMemo(
    () => ({
      profil,
      etat,
      meilleureChaine,
      today,
      hydrated,
      updateProfil,
      appliquerContrat,
      terminerSeance,
    }),
    [profil, etat, meilleureChaine, today, hydrated, updateProfil, appliquerContrat, terminerSeance]
  );

  return <MoteurContext.Provider value={value}>{children}</MoteurContext.Provider>;
}

export function useMoteur(): MoteurContextValue {
  const ctx = useContext(MoteurContext);
  if (!ctx) throw new Error("useMoteur doit être utilisé dans un <MoteurProvider>.");
  return ctx;
}

export function useMoteurPlan() {
  const moteur = useMoteur();
  const semaine = useMemo(
    () => (moteur.hydrated ? planifierSemaine(moteur.profil, moteur.etat, CATALOGUE, moteur.today) : []),
    [moteur.etat, moteur.hydrated, moteur.profil, moteur.today]
  );
  const jour = semaine.find((j) => j.date === moteur.today);
  return { ...moteur, semaine, jour };
}
