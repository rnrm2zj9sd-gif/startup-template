"use client";

import { messageLienMagique } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    const supabase = createClient();
    const origin = window.location.origin;
    const redirect = new URL("/auth/callback", origin);
    if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      redirect.searchParams.set("next", nextPath);
    }
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirect.toString(),
      },
    });

    setLoading(false);

    if (authError) {
      setError(messageLienMagique(authError));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-border bg-panel p-5 text-sm text-muted-foreground">
        Regarde tes e-mails. Clique le lien pour entrer. Pense aussi aux indésirables.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@email.com"
          disabled={loading}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
        {loading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden /> : null}
        Envoyer le lien
      </Button>
    </form>
  );
}
