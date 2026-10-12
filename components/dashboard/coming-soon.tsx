import { DashboardHeader } from "@/components/dashboard/dashboard-header";

/** Page provisoire pour les sections hors V1. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <DashboardHeader title={title} description={description} />
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-xs tracking-[0.3em] text-brand-purple">BIENTÔT</p>
        <p className="text-sm text-muted-foreground">Cette section arrive dans une prochaine version.</p>
      </div>
    </>
  );
}
