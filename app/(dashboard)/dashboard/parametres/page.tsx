import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SettingsPageContent } from "@/components/dashboard/settings-form";

export default function ParametresPage() {
  return (
    <>
      <DashboardHeader title="Paramètres" description="Profil, personnage, compétences, et tes données." />
      <SettingsPageContent />
    </>
  );
}
