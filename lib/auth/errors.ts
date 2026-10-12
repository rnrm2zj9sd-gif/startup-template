type AuthLikeError = {
  message?: string;
  code?: string;
  status?: number;
};

export function messageLienMagique(error: AuthLikeError): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  const rateLimited =
    error.status === 429 ||
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("over_email_send_rate_limit");

  if (rateLimited) {
    return "Trop de liens envoyés. Le plan gratuit limite les e-mails (souvent ~3 par heure). Réessaie dans une heure, ou crée un utilisateur de test dans Supabase → Authentication → Users.";
  }

  return "Impossible d'envoyer le lien. Vérifie l'e-mail et réessaie.";
}
