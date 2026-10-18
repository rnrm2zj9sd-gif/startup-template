import { DevPasswordLogin } from "@/components/auth/dev-password-login";
import { LoginForm } from "@/components/auth/login-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connexion — THEMILION SYSTEM",
  description: "Entre avec un lien magique envoyé sur ton e-mail.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost" }), "absolute left-4 top-4 md:left-8 md:top-8")}
      >
        <ChevronLeft className="mr-2 size-4" aria-hidden />
        Retour
      </Link>

      <div className="mx-auto flex w-full max-w-md flex-col gap-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs tracking-[0.3em] text-brand-purple">SYSTEM ONLINE</p>
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="text-sm text-muted-foreground">Entre ton e-mail. On t&apos;envoie un lien, sans mot de passe.</p>
        </div>

        {params.error ? (
          <p className="text-center text-sm text-destructive">Lien invalide ou expiré. Demande-en un nouveau.</p>
        ) : null}

        <LoginForm nextPath={nextPath} />

        {process.env.NODE_ENV === "development" || process.env.E2E_PASSWORD_LOGIN === "1" ? (
          <DevPasswordLogin nextPath={nextPath} />
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
            Pas encore de compte ? Enregistrer un mot de passe
          </Link>
        </p>
      </div>
    </div>
  );
}
