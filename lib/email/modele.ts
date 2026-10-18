function cadre(titre: string, corps: string, cta: { href: string; label: string } | null): string {
  const bouton = cta
    ? `<p style="margin:28px 0 8px"><a href="${cta.href}" style="display:inline-block;background:#8B5CF6;color:#FAFAFA;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${cta.label}</a></p>`
    : "";
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#04060B;color:#FAFAFA;font-family:Geist,ui-sans-serif,system-ui,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04060B;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#0B0E18;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.28em;color:#8B5CF6">THEMILION SYSTEM</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${titre}</h1>
          <div style="font-size:15px;line-height:1.55;color:#94A3B8">${corps}</div>
          ${bouton}
          <p style="margin:24px 0 0;font-size:12px;color:#64748B">Si tu n'es pas à l'origine de cet e-mail, ignore-le.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailMotDePasseOublie(lien: string) {
  return {
    sujet: "Réinitialise ton mot de passe",
    html: cadre(
      "Nouveau mot de passe",
      "<p>Tu as demandé à récupérer ton compte. Le lien expire dans une heure.</p>",
      { href: lien, label: "Choisir un mot de passe" },
    ),
  };
}

export function emailDemandeSuppression(lien: string) {
  return {
    sujet: "Confirme la suppression de ton compte",
    html: cadre(
      "Suppression du compte",
      "<p>Cette action efface tes missions, ton XP, ton personnage et tes données personnelles. Elle est définitive.</p>",
      { href: lien, label: "Confirmer la suppression" },
    ),
  };
}

export function emailCompteSupprime() {
  return {
    sujet: "Ton compte THEMILION a été supprimé",
    html: cadre(
      "Données effacées",
      "<p>Ton compte et tes données associées ont été supprimés. Tu peux recréer un personnage plus tard si tu le souhaites.</p>",
      null,
    ),
  };
}
