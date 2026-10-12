"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Visible uniquement si le serveur le monte (NODE_ENV === "development"). */
export function DevPasswordLogin({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError("E-mail ou mot de passe incorrect.");
      return;
    }

    router.replace(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6">
      <p className="text-xs tracking-[0.3em] text-muted-foreground">DEV — MOT DE PASSE</p>
      <p className="text-sm text-muted-foreground">
        Uniquement en local. Crée tes comptes dans Supabase → Authentication → Users.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-email">E-mail</Label>
          <Input
            id="dev-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-password">Mot de passe</Label>
          <Input
            id="dev-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="outline" disabled={loading}>
          {loading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          Entrer avec mot de passe
        </Button>
      </form>
    </div>
  );
}
