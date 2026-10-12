import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — THEMILION SYSTEM",
  description: "Ton System personnel : niveau, missions du jour, attributs et série.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <DashboardShell>{children}</DashboardShell>
    </OnboardingGate>
  );
}
