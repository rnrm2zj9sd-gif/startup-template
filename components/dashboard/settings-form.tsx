"use client";

import { CompetenceSettings } from "@/components/dashboard/competence-settings";
import { CharacterPicker } from "@/components/system/character-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/profile-store";
import type { Gender } from "@/types/player";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function SettingsForm() {
  const { profile, hydrated, updateProfile } = useProfile();
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Ton prénom ne peut pas être vide.");
      return;
    }
    updateProfile({ name: trimmed, gender });
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

export function SettingsPageContent() {
  return (
    <div className="flex flex-col gap-10">
      <SettingsForm />
      <CompetenceSettings />
      <p className="text-sm text-muted-foreground">
        <Link href="/onboarding" className="underline underline-offset-4 hover:text-foreground">
          Refaire l&apos;initiation
        </Link>
      </p>
    </div>
  );
}
