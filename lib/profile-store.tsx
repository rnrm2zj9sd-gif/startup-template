"use client";

import { demoUser } from "@/config/user";
import type { UserProfile } from "@/types/player";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "themilion:profile";

interface ProfileContextValue {
  profile: UserProfile;
  /** Vrai une fois le profil relu depuis le navigateur. */
  hydrated: boolean;
  updateProfile: (patch: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Profil utilisateur côté client.
 * Point de départ : `demoUser` ; les modifications (nom, personnage) sont
 * persistées en localStorage en attendant un vrai backend.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(demoUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserProfile>;
        setProfile({ ...demoUser, ...saved });
      }
    } catch {
      // Stockage indisponible ou corrompu : on garde le profil de démo.
    }
    setHydrated(true);
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => {
    setProfile((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignoré : la mise à jour reste valable pour la session.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ profile, hydrated, updateProfile }),
    [profile, hydrated, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile doit être utilisé dans un <ProfileProvider>.");
  }
  return ctx;
}
