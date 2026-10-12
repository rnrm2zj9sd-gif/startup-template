import { LogoutButton } from "@/components/auth/logout-button";
import { InitiationFlow } from "@/components/onboarding/initiation-flow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Initiation — THEMILION SYSTEM",
  description: "Choisis tes objectifs, tes compétences et ton rythme.",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto mb-6 flex max-w-lg justify-end">
        <LogoutButton />
      </div>
      <InitiationFlow />
    </div>
  );
}
