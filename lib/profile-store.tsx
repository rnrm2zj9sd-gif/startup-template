"use client";

import { emptyProfile } from "@/config/user";
import { createClient } from "@/lib/supabase/client";
import type { Gender, UserProfile } from "@/types/player";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ProfileContextValue {
  profile: UserProfile;
  userId: string | null;
  /** Vrai une fois le compte Supabase relu. */
  hydrated: boolean;
  updateProfile: (patch: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function genderKey(userId: string) {
  return `themilion:gender:${userId}`;
}

function readGender(userId: string): Gender | null {
  try {
    const raw = window.localStorage.getItem(genderKey(userId));
    if (raw === "male" || raw === "female") return raw;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Identité du dashboard = compte connecté (`profiles`), sinon état vide.
 * Plus de profil démo Willys.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setUserId(null);
        setProfile(emptyProfile);
        setHydrated(true);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("pseudo, onboarding_done")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const pseudo = (data?.pseudo ?? "").trim();
      const fallback = user.email?.split("@")[0] ?? "";

      setUserId(user.id);
      setProfile({
        ...emptyProfile,
        name: pseudo || fallback,
        gender: readGender(user.id) ?? "male",
        onboardingDone: Boolean(data?.onboarding_done),
      });
      setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => {
    setProfile((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      if (userId && next.gender !== prev.gender) {
        try {
          window.localStorage.setItem(genderKey(userId), next.gender);
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [userId]);

  const value = useMemo(
    () => ({ profile, userId, hydrated, updateProfile }),
    [profile, userId, hydrated, updateProfile],
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
