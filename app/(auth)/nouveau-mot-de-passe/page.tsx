import { NouveauMotDePasseForm } from "@/components/auth/nouveau-mot-de-passe-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — THEMILION SYSTEM",
};

export default function NouveauMotDePassePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs tracking-[0.3em] text-brand-purple">SYSTEM ONLINE</p>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">Choisis-en un que tu pourras retenir.</p>
        </div>
        <NouveauMotDePasseForm />
      </div>
    </div>
  );
}
