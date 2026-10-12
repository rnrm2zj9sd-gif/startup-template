"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { CharacterAvatar } from "@/components/system/character-avatar";
import { dashboardNav } from "@/config/dashboard";
import { useProfile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  /** Variante du tiroir mobile (sans le logo, déjà dans la barre). */
  compact?: boolean;
}

export function Sidebar({ compact = false }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useProfile();

  return (
    <div className="flex h-full flex-col">
      {!compact && (
        <div className="flex h-16 items-center px-5">
          <Link href="/" className="leading-none">
            <span className="block text-sm font-semibold tracking-[0.22em]">THEMILION</span>
            <span className="mt-0.5 block text-[10px] tracking-[0.35em] text-muted-foreground">
              SYSTEM
            </span>
          </Link>
        </div>
      )}

      <nav aria-label="Navigation du dashboard" className="flex-1 px-3 pt-2">
        <ul className="space-y-0.5">
          {dashboardNav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-white/5 text-foreground"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn("size-4", active ? "text-brand-purple" : "text-muted-foreground")}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 pb-2">
        <LogoutButton />
      </div>

      <Link
        href="/dashboard/parametres"
        className="m-3 flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-white/15 hover:bg-panel"
      >
        <CharacterAvatar gender={profile.gender} size={64} />
        <span className="mt-3 block truncate text-sm font-semibold tracking-[0.12em]">
          {profile.name.toUpperCase()}
        </span>
        <span className="mt-0.5 text-[11px] tracking-[0.2em] text-muted-foreground">
          {profile.className}
        </span>
        <span className="mt-2 inline-flex w-fit items-center rounded-full border border-brand-gold/30 bg-brand-gold/10 px-2 py-0.5 font-mono text-[11px] text-brand-gold">
          RANG {profile.rank}
        </span>
        <span className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          Voir le profil
          <ArrowRight className="size-3" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
