import { Resend } from "resend";

const EXPEDITEUR_DEFAUT = "THEMILION SYSTEM <system@themilion.shop>";

export function emailConfigure(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function envoyerEmail(input: { to: string; sujet: string; html: string }): Promise<void> {
  const cle = process.env.RESEND_API_KEY?.trim();
  if (!cle) {
    throw new Error("RESEND_API_KEY manquante.");
  }
  const from = process.env.EMAIL_FROM?.trim() || EXPEDITEUR_DEFAUT;
  const resend = new Resend(cle);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.sujet,
    html: input.html,
  });
  if (error) throw new Error(error.message);
}
