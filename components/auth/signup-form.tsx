"use client";

import { CharacterPicker } from "@/components/system/character-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptyProfile } from "@/config/user";
import { messageInscription } from "@/lib/auth/errors";
import { useProfile } from "@/lib/profile-store";
import { createClient } from "@/lib/supabase/client";
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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { pseudo: trimmed },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(messageInscription(authError));
      return;
    }

    try {
      window.localStorage.setItem(`themilion:gender:${data.user?.id ?? "pending"}`, gender);
    } catch {
      // ignore
    }

    updateProfile({
      name: trimmed,
      gender,
      level: 1,
      className: "",
      rank: "E",
      xp: 0,
      xpNext: emptyProfile.xpNext,
      onboardingDone: false,
      initiation: undefined,
    });

    if (data.session) {
      if (data.user) {
        await supabase.from("profiles").update({ pseudo: trimmed }).eq("id", data.user.id);
      }
      toast.success("Compte créé.", { description: "On construit ton contrat." });
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setLoading(false);
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <p className="rounded-2xl border border-border bg-panel p-5 text-sm text-muted-foreground">
        Compte enregistré. Confirme l&apos;e-mail si on te le demande, puis connecte-toi.
      </p>
    );
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
        <div className="grid gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password-confirm">Confirme le mot de passe</Label>
          <Input
            id="password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            disabled={loading}
          />
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-xs tracking-[0.3em] text-muted-foreground">CHOISIS TON PERSONNAGE</legend>
        <CharacterPicker value={gender} onChange={setGender} />
        <p className="text-xs text-muted-foreground">Modifiable plus tard dans Paramètres.</p>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={loading} className="h-10 bg-brand-purple text-white hover:bg-brand-purple/90">
        {loading && <Loader className="mr-2 size-4 animate-spin" aria-hidden />}
        Enregistrer mon mot de passe
      </Button>
    </form>
  );
}
