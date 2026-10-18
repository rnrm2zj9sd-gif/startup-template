import { SupprimerCompteForm } from "@/components/auth/supprimer-compte-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Supprimer le compte — THEMILION SYSTEM",
};

export default async function SupprimerComptePage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "absolute left-4 top-4 md:left-8 md:top-8")}>
        <ChevronLeft className="mr-2 size-4" aria-hidden />
        Accueil
      </Link>
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs tracking-[0.3em] text-brand-purple">SYSTEM ONLINE</p>
          <h1 className="text-2xl font-semibold tracking-tight">Supprimer le compte</h1>
          <p className="text-sm text-muted-foreground">
            Tes missions, ton XP et ton personnage seront effacés. Cette action est définitive.
          </p>
        </div>
        {jeton ? (
          <SupprimerCompteForm jeton={jeton} />
        ) : (
          <p className="text-sm text-muted-foreground">Lien incomplet. Demande un nouvel e-mail depuis Paramètres.</p>
        )}
      </div>
    </div>
  );
}
