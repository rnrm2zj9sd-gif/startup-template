"use client";

import { useProfile } from "@/lib/profile-store";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardHeaderProps {
  /** Remplace « Bonjour, {name}. » (pages secondaires). */
  title?: string;
  description?: string;
}

function formatToday(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { profile } = useProfile();
  const isHome = !title;
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(formatToday());
  }, []);

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
          {title ?? (profile.name ? <>Bonjour, {profile.name}.</> : <>Bonjour.</>)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ?? (isHome ? "Chaque action te rapproche de ta meilleure version." : (today ?? "…"))}
        </p>
      </div>
      {isHome && (
        <p className="flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground">
          <Calendar className="size-3.5" aria-hidden />
          {today ?? "…"}
        </p>
      )}
    </header>
  );
}
