"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/mot-de-passe-oublie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Impossible d'envoyer l'e-mail. Réessaie.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p data-testid="forgot-sent" className="rounded-2xl border border-border bg-panel p-5 text-sm text-muted-foreground">
        Si un compte existe, tu vas recevoir un e-mail. Clique le lien, puis choisis un nouveau mot de passe. Pense aux
        indésirables.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          data-testid="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@email.com"
          disabled={loading}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" data-testid="forgot-submit" disabled={loading} className="bg-primary text-primary-foreground">
        {loading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden /> : null}
        Envoyer le lien
      </Button>
    </form>
  );
}
