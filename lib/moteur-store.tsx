"use client";

import { emptyMoteurProfil } from "@/config/moteur-demo";
import {
  CATALOGUE,
  etatInitial,
  planifierSemaine,
  type EtatUtilisateur,
  type Profil,
  type Ressenti,
  type SeancePrevue,
} from "@/lib/moteur";
import { aujourdHuiISO } from "@/lib/moteur/app";
import { persistContrat, profilDepuisLignes, type ContratPersiste } from "@/lib/progression/contrat";
import { createClient } from "@/lib/supabase/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface MoteurContextValue {
  profil: Profil;
  etat: EtatUtilisateur;
  meilleureChaine: number;
  today: string;
  hydrated: boolean;
  updateProfil: (patch: Partial<Profil> | ((prev: Profil) => Profil)) => void;
  appliquerContrat: (profil: Profil, etat?: EtatUtilisateur) => Promise<void>;
  terminerSeance: (seance: SeancePrevue, ressenti: Ressenti) => void;
}

const MoteurContext = createContext<MoteurContextValue | null>(null);

/**
 * Contrat (compétences, matériel) lu depuis Supabase.
 * Plus d'XP ni d'historique dans localStorage — seulement l'affichage (genre) y reste.
 */
export function MoteurProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil>(emptyMoteurProfil);
  const [etat, setEtat] = useState<EtatUtilisateur>(etatInitial);
  const [hydrated, setHydrated] = useState(false);
  const today = aujourdHuiISO();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setHydrated(true);
        return;
      }

      const [{ data: choix }, { data: catalogRow }, { data: progress }] = await Promise.all([
        supabase
          .from("user_skill_choices")
          .select("competence_id, focus_ids, seances_semaine, minutes_max")
          .eq("user_id", user.id),
        supabase.from("custom_catalog").select("data").eq("user_id", user.id).maybeSingle(),
        supabase.from("skill_progress").select("competence_id, focus_id, niveau, palier").eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setProfil(
        profilDepuisLignes({
          userId: user.id,
          choix: choix ?? [],
          catalog: (catalogRow?.data ?? null) as ContratPersiste | null,
        }),
      );
      const nextEtat = etatInitial();
      for (const p of progress ?? []) {
        nextEtat.progression[`${p.competence_id}:${p.focus_id}`] = { niveau: p.niveau, palier: p.palier };
      }
      setEtat(nextEtat);
      setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfil = useCallback((patch: Partial<Profil> | ((prev: Profil) => Profil)) => {
    setProfil((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const appliquerContrat = useCallback(async (next: Profil, _nextEtat: EtatUtilisateur = etatInitial()) => {
    setProfil(next);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await persistContrat(supabase, user.id, next);
  }, []);

  const terminerSeance = useCallback((_seance: SeancePrevue, _ressenti: Ressenti) => {
    // L'XP et le statut passent par POST /api/missions/validate.
  }, []);

  const value = useMemo(
    () => ({
      profil,
      etat,
      meilleureChaine: 0,
      today,
      hydrated,
      updateProfil,
      appliquerContrat,
      terminerSeance,
    }),
    [profil, etat, today, hydrated, updateProfil, appliquerContrat, terminerSeance],
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
    [moteur.etat, moteur.hydrated, moteur.profil, moteur.today],
  );
  const jour = semaine.find((j) => j.date === moteur.today);
  return { ...moteur, semaine, jour };
}
