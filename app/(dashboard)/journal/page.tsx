"use client";

import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { texteJournal } from "@/lib/progression/journal";
import type { JournalLigne } from "@/lib/progression/types";
import { useCallback, useEffect, useState } from "react";

function DateLabel({ iso }: { iso: string }) {
  const [txt, setTxt] = useState("…");
  useEffect(() => {
    setTxt(
      new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [iso]);
  return (
    <time dateTime={iso} className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
      {txt}
    </time>
  );
}

export default function JournalPage() {
  const [lignes, setLignes] = useState<JournalLigne[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (from: string | null, append: boolean) => {
    setLoading(true);
    const url = from ? `/api/me/journal?cursor=${encodeURIComponent(from)}` : "/api/me/journal";
    const res = await fetch(url);
    setLoading(false);
    if (!res.ok) return;
    const json = (await res.json()) as { lignes: JournalLigne[]; nextCursor: string | null };
    setLignes((prev) => (append && prev ? [...prev, ...json.lignes] : json.lignes));
    setCursor(json.nextCursor);
  }, []);

  useEffect(() => {
    void load(null, false);
  }, [load]);

  return (
    <>
      <DashboardHeader title="Journal" description="Le System Log, du plus récent au plus ancien." />

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-[11px] tracking-[0.3em] text-muted-foreground">
          SYSTEM LOG
        </h2>
        {lignes === null ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Rien pour l&apos;instant. Valide une mission.</p>
        ) : (
          <ol className="divide-y divide-border">
            {lignes.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm" data-log-id={l.id}>
                <span className={l.type === "xp_gagnee" ? "text-brand-gold" : ""}>{texteJournal(l)}</span>
                <DateLabel iso={l.created_at} />
              </li>
            ))}
          </ol>
        )}
        {cursor && (
          <div className="border-t border-border px-5 py-4">
            <Button type="button" variant="outline" disabled={loading} onClick={() => void load(cursor, true)} className="h-10 w-full">
              {loading ? "Chargement…" : "Plus anciens"}
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
