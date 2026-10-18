"use client";

import { SupprimerComptePanel } from "@/components/dashboard/supprimer-compte";
import { CharacterPicker } from "@/components/system/character-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/profile-store";
import { createClient } from "@/lib/supabase/client";
import type { Gender } from "@/types/player";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function SettingsForm() {
  const { profile, userId, hydrated, updateProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender>(profile.gender);

  // Resynchronise le formulaire une fois le profil relu depuis le navigateur.
  useEffect(() => {
    if (hydrated) {
      setName(profile.name);
      setGender(profile.gender);
    }
  }, [hydrated, profile.name, profile.gender]);

  const dirty = name.trim() !== profile.name || gender !== profile.gender;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Ton prénom ne peut pas être vide.");
      return;
    }
    updateProfile({ name: trimmed, gender });
    if (userId) {
      const supabase = createClient();
      let { error } = await supabase.from("profiles").update({ pseudo: trimmed, gender }).eq("id", userId);
      if (error) {
        const retry = await supabase.from("profiles").update({ pseudo: trimmed }).eq("id", userId);
        error = retry.error;
      }
      if (error) {
        toast.error("Le prénom n’a pas été enregistré sur le compte.");
        return;
      }
    }
    toast.success("Profil mis à jour.");
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-xs tracking-[0.3em] text-muted-foreground">IDENTITÉ</h2>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="name">Prénom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            maxLength={40}
            className="max-w-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-xs tracking-[0.3em] text-muted-foreground">PERSONNAGE</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis ton personnage. Tu peux en changer à tout moment.
        </p>
        <CharacterPicker value={gender} onChange={setGender} className="mt-4 max-w-md" />
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty} className="bg-brand-purple text-white hover:bg-brand-purple/90">
          Enregistrer
        </Button>
        {dirty && <p className="text-xs text-muted-foreground">Modifications non enregistrées.</p>}
      </div>
    </form>
  );
}

function CompetencesLink() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground">COMPÉTENCES</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ajoute ou retire tes compétences (1 à 5). Un changement s&apos;applique dès demain.
      </p>
      <Link
        href="/competences"
        className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
      >
        Gérer mes compétences
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

export function SettingsPageContent() {
  return (
    <div className="flex flex-col gap-10">
      <SettingsForm />
      <CompetencesLink />
      <SupprimerComptePanel />
    </div>
  );
}
