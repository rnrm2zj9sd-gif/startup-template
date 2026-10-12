"use client";

import { useProfile } from "@/lib/profile-store";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, hydrated } = useProfile();

  useEffect(() => {
    if (hydrated && profile.onboardingDone === false) router.replace("/onboarding");
  }, [hydrated, profile.onboardingDone, router]);

  return <>{children}</>;
}
