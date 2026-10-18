export function origineDepuis(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  return new URL(request.url).origin;
}

const REF_PROD = "kazdyhxetsevlpxexmof";

/** Le lien d'e-mail n'est renvoyé qu'en développement, ou si le drapeau est actif et que l'URL ne vise pas la prod. */
export function emailExposeLien(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.EMAIL_RETOUR_LIEN !== "1") return false;
  return !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(REF_PROD);
}
