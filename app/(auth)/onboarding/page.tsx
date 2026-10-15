import { LogoutButton } from "@/components/auth/logout-button";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Initiation — THEMILION SYSTEM",
  description: "Ton personnage, tes compétences, ton temps : ton contrat en quatre écrans.",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen px-4 pb-12 pt-6 md:px-6 md:py-16">
      <div className="mx-auto mb-6 flex max-w-lg justify-end">
        <LogoutButton />
      </div>
      <OnboardingFlow />
    </div>
  );
}
