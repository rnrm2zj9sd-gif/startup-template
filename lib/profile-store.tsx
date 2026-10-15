"use client";

import { emptyProfile } from "@/config/user";
import { parseInitiationProfile } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";
import { parseGender, type Gender, type UserProfile } from "@/types/player";
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
  /** Relit niveau, rang et XP depuis GET /api/me/progression (après une validation). */
  reloadProgression: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProgressionProfil = Pick<UserProfile, "level" | "className" | "rank" | "xp" | "xpNext" | "power" | "missionsValidees">;

async function lireProgression(): Promise<ProgressionProfil | null> {
  try {
    const res = await fetch("/api/me/progression");
    if (!res.ok) return null;
    const snap = await res.json();
    return {
      level: snap.niveau,
      className: snap.classe,
      rank: snap.rang,
      xp: snap.xpDansNiveau,
      xpNext: snap.xpPourSuivant,
      power: snap.power,
      missionsValidees: snap.missionsValidees,
    };
  } catch {
    return null;
  }
}

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

      const first = await supabase
        .from("profiles")
        .select("pseudo, onboarding_done, gender, initiation")
        .eq("id", user.id)
        .maybeSingle();

      let data = first.data;
      if (first.error) {
        const fallbackRow = await supabase
          .from("profiles")
          .select("pseudo, onboarding_done")
          .eq("id", user.id)
          .maybeSingle();
        data = fallbackRow.data as typeof data;
      }

      if (cancelled) return;

      const pseudo = (data?.pseudo ?? "").trim();
      const fallback = user.email?.split("@")[0] ?? "";

      const progression: ProgressionProfil = (await lireProgression()) ?? {
        level: emptyProfile.level,
        className: emptyProfile.className,
        rank: emptyProfile.rank,
        xp: emptyProfile.xp,
        xpNext: emptyProfile.xpNext,
        power: 0,
        missionsValidees: 0,
      };

      if (cancelled) return;

      const storedGender = readGender(user.id);
      const dbGender = parseGender(data?.gender);
      const gender = storedGender ?? dbGender ?? "male";
      if (storedGender) {
        let persisted = dbGender === storedGender;
        if (!persisted) {
          const { error } = await supabase.from("profiles").update({ gender: storedGender }).eq("id", user.id);
          persisted = !error;
        }
        if (persisted) {
          try {
            window.localStorage.removeItem(genderKey(user.id));
          } catch {
            // ignore
          }
        }
      }

      setUserId(user.id);
      setProfile({
        ...emptyProfile,
        name: pseudo || fallback,
        gender,
        onboardingDone: Boolean(data?.onboarding_done),
        initiation: parseInitiationProfile(data?.initiation),
        ...progression,
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
        void createClient().from("profiles").update({ gender: next.gender }).eq("id", userId);
      }
      return next;
    });
  }, [userId]);

  const reloadProgression = useCallback(async () => {
    const progression = await lireProgression();
    if (progression) setProfile((prev) => ({ ...prev, ...progression }));
  }, []);

  const value = useMemo(
    () => ({ profile, userId, hydrated, updateProfile, reloadProgression }),
    [profile, userId, hydrated, updateProfile, reloadProgression],
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
