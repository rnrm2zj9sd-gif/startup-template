"use client";

import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CharacterAvatar } from "@/components/system/character-avatar";
import { useProfile } from "@/lib/profile-store";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-surface md:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="text-sm font-semibold tracking-[0.2em]">
          THEMILION
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/planning" aria-label="Planning" className="text-muted-foreground">
            <CalendarDays className="size-4" />
          </Link>
          <Link href="/dashboard/parametres" aria-label="Profil" className="rounded-full">
            <CharacterAvatar gender={profile.gender} size={32} />
          </Link>
        </div>
      </header>

      <main className="min-w-0 px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8 xl:px-8">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
