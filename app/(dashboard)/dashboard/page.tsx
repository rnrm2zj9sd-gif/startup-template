import { DailySystem } from "@/components/dashboard/daily-system";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SystemPanel } from "@/components/dashboard/system-panel";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <DailySystem />
        <SystemPanel className="hidden xl:sticky xl:top-6 xl:block" />
      </div>
    </>
  );
}
