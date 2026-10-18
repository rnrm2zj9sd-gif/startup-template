import { debutJourLocal, jourLocal } from "@/lib/temps";
import { decalerJour } from "@/lib/progression/snapshot";

export const HEURE_DEBUT = 6;
export const HEURE_FIN = 22;
export const PX_PAR_HEURE = 72;

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function lundiDe(ymd: string): string {
  const d = parseYmd(ymd);
  const jour = d.getUTCDay();
  const delta = jour === 0 ? -6 : 1 - jour;
  return decalerJour(ymd, delta);
}

export function joursSemaine(ymd: string): string[] {
  const lundi = lundiDe(ymd);
  return Array.from({ length: 7 }, (_, i) => decalerJour(lundi, i));
}

export function debutMois(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function joursDuMois(ymd: string): string[] {
  const start = debutMois(ymd);
  const [y, m] = start.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => decalerJour(start, i));
}

export function grilleMois(ymd: string): string[] {
  const jours = joursDuMois(ymd);
  const padAvant = (() => {
    const d = parseYmd(jours[0]).getUTCDay();
    return d === 0 ? 6 : d - 1;
  })();
  const avant = Array.from({ length: padAvant }, (_, i) => decalerJour(jours[0], i - padAvant));
  const apres = 42 - avant.length - jours.length;
  const fin = Array.from({ length: Math.max(0, apres) }, (_, i) => decalerJour(jours[jours.length - 1], i + 1));
  return [...avant, ...jours, ...fin];
}

export function libellePeriode(vue: "jour" | "semaine" | "mois", ymd: string): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (vue === "jour") return fmt.format(parseYmd(ymd));
  if (vue === "semaine") {
    const js = joursSemaine(ymd);
    const a = parseYmd(js[0]);
    const b = parseYmd(js[6]);
    const court = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
    return `${court.format(a)} – ${fmt.format(b)}`;
  }
  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(parseYmd(debutMois(ymd)));
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

export function instantLocal(ymd: string, hm: string, timezone: string): Date {
  const [h, mi] = hm.split(":").map(Number);
  const start = debutJourLocal(parseYmd(ymd), timezone);
  return new Date(start.getTime() + (h * 60 + mi) * 60_000);
}

export function hmDansZone(iso: string, timezone: string): string {
  const p = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const h = p.find((x) => x.type === "hour")?.value ?? "00";
  const m = p.find((x) => x.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

export function ymdDansZone(iso: string, timezone: string): string {
  return jourLocal(new Date(iso), timezone);
}

export function minutesDepuisMinuit(iso: string, timezone: string): number {
  const [h, m] = hmDansZone(iso, timezone).split(":").map(Number);
  return h * 60 + m;
}

export function decalerVue(vue: "jour" | "semaine" | "mois", ymd: string, sens: -1 | 1): string {
  if (vue === "jour") return decalerJour(ymd, sens);
  if (vue === "semaine") return decalerJour(ymd, 7 * sens);
  const [y, m] = debutMois(ymd).split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + sens, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function bornesChargement(vue: "jour" | "semaine" | "mois", ymd: string): { from: string; to: string } {
  if (vue === "jour") return { from: ymd, to: ymd };
  if (vue === "semaine") {
    const js = joursSemaine(ymd);
    return { from: js[0], to: js[6] };
  }
  const g = grilleMois(ymd);
  return { from: g[0], to: g[g.length - 1] };
}
