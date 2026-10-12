/** Date civile YYYY-MM-DD dans un fuseau IANA (ex. Europe/Paris). */
export function jourLocal(date: Date, timezone: string): string {
  const p = partsInZone(date, timezone);
  return `${pad(p.year, 4)}-${pad(p.month, 2)}-${pad(p.day, 2)}`;
}

/** Instant UTC du début du jour local (00:00:00.000). */
export function debutJourLocal(date: Date, timezone: string): Date {
  const ymd = jourLocal(date, timezone);
  const [year, month, day] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);

  let instant = new Date(utcGuess - offsetMs(new Date(utcGuess), timezone));
  instant = new Date(utcGuess - offsetMs(instant, timezone));

  if (jourLocal(instant, timezone) !== ymd) {
    instant = new Date(instant.getTime() + 2 * 60 * 60 * 1000);
    const p = partsInZone(instant, timezone);
    const elapsed = ((p.hour * 60 + p.minute) * 60 + p.second) * 1000;
    instant = new Date(instant.getTime() - elapsed);
  }

  return instant;
}

/** Dernière milliseconde du jour local (juste avant minuit suivant). */
export function finJourLocal(date: Date, timezone: string): Date {
  const start = debutJourLocal(date, timezone);
  const next = debutJourLocal(new Date(start.getTime() + 36 * 60 * 60 * 1000), timezone);
  return new Date(next.getTime() - 1);
}

function pad(n: number, size: number): string {
  return String(n).padStart(size, "0");
}

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const out: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}
