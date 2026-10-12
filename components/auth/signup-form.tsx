"use client";

import { CharacterPicker } from "@/components/system/character-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/profile-store";
import type { Gender } from "@/types/player";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export function SignupForm() {
  const router = useRouter();
  const { updateProfile } = useProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    // TODO: créer le compte côté serveur (auth + persistance du profil).
    await new Promise((r) => setTimeout(r, 600));

    updateProfile({
      name: name.trim(),
      gender,
      level: 1,
      className: "PLAYER",
      rank: "E",
      xp: 0,
      xpNext: 1600,
      onboardingDone: false,
      initiation: undefined,
    });
    toast.success("PLAYER IDENTIFIED", { description: "On construit ton contrat." });
    router.push("/onboarding");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Prénom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            autoComplete="given-name"
            required
            maxLength={40}
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            disabled={loading}
          />
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-xs tracking-[0.3em] text-muted-foreground">
          CHOISIS TON PERSONNAGE
        </legend>
        <CharacterPicker value={gender} onChange={setGender} />
        <p className="text-xs text-muted-foreground">Modifiable plus tard dans Paramètres.</p>
      </fieldset>

      <Button
        type="submit"
        disabled={loading}
        className="h-10 bg-brand-purple text-white hover:bg-brand-purple/90"
      >
        {loading && <Loader className="mr-2 size-4 animate-spin" aria-hidden />}
        Entrer dans le System
      </Button>
    </form>
  );
}
