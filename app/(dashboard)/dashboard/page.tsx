import { AttributesGrid } from "@/components/dashboard/attributes-grid";
import { DailyMissions } from "@/components/dashboard/daily-missions";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StreakCard } from "@/components/dashboard/streak-card";
import { SystemPanel } from "@/components/dashboard/system-panel";
import { FirstMissionCard } from "@/components/onboarding/first-mission-card";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />

      <div className="flex flex-col gap-5 md:gap-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-stretch">
          <SystemPanel />
          <StreakCard />
        </div>
        <FirstMissionCard />
        <AttributesGrid />
        <DailyMissions />
      </div>
    </>
  );
}
