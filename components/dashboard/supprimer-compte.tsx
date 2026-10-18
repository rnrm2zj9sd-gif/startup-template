"use client";

import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { useState } from "react";

export function SupprimerComptePanel() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function demander() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/me/compte", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Impossible d'envoyer l'e-mail.");
      return;
    }
    setSent(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground">TES DONNÉES</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tu peux tout effacer (RGPD). Un e-mail de confirmation est obligatoire. L&apos;action est définitive.
      </p>
      {sent ? (
        <p data-testid="delete-sent" className="mt-4 text-sm text-muted-foreground">
          Regarde tes e-mails. Clique le lien, puis écris SUPPRIMER.
        </p>
      ) : (
        <Button
          type="button"
          data-testid="delete-request"
          variant="destructive"
          className="mt-4"
          disabled={loading}
          onClick={() => void demander()}
        >
          {loading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          Supprimer mon compte
        </Button>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
