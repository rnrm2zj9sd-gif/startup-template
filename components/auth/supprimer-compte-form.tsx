"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SupprimerCompteForm({ jeton }: { jeton: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/compte/supprimer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jeton, confirmation }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "La suppression a échoué.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoading(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p data-testid="compte-supprime" className="rounded-2xl border border-border bg-panel p-5 text-sm text-muted-foreground">
        Ton compte et tes données ont été effacés.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="confirm-delete">Écris SUPPRIMER</Label>
        <Input
          id="confirm-delete"
          data-testid="confirm-delete"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          disabled={loading}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          {error}{" "}
          <Link
            href={`/login?next=${encodeURIComponent(`/supprimer-compte?jeton=${jeton}`)}`}
            className="underline underline-offset-4"
          >
            Connexion
          </Link>
        </p>
      ) : null}
      <Button type="submit" data-testid="confirm-delete-submit" variant="destructive" disabled={loading}>
        {loading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden /> : null}
        Effacer mes données
      </Button>
    </form>
  );
}
