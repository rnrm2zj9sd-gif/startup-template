"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { CharacterAvatar } from "@/components/system/character-avatar";
import { useProfile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Coque du dashboard : sidebar fixe à partir de `md`, barre supérieure
 * et tiroir de navigation en dessous.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useProfile();

  // Ferme le tiroir à chaque navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-surface md:block">
        <Sidebar />
      </aside>

      {/* Barre mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="text-sm font-semibold tracking-[0.2em]">
          THEMILION
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/parametres" aria-label="Profil" className="rounded-full">
            <CharacterAvatar gender={profile.gender} size={32} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="dashboard-nav"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
          </button>
        </div>
      </header>

      {/* Tiroir mobile */}
      <div
        id="dashboard-nav"
        className={cn(
          "fixed inset-0 top-14 z-20 bg-background/80 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      >
        <div
          className={cn(
            "h-full w-72 max-w-[85vw] border-r border-border bg-surface transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Sidebar compact />
        </div>
      </div>

      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 xl:px-8">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
