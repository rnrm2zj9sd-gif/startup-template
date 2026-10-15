import { RESSENTI_LABELS } from "@/lib/moteur/app";
import type { Ressenti } from "@/lib/moteur";
import type { JournalLigne } from "./types";

export function texteJournal(l: JournalLigne): string {
  const p = l.payload ?? {};
  switch (l.type) {
    case "mission_validee":
      return `Mission validée · ressenti ${RESSENTI_LABELS[p.ressenti as Ressenti]?.toLowerCase() ?? "—"}`;
    case "xp_gagnee":
      return `+${p.xp} XP${p.plafond ? " (plafond atteint)" : ""}`;
    case "niveau_gagne":
      return `Niveau ${p.de} → ${p.vers}`;
    case "rang_obtenu":
      return `Rang ${p.vers} obtenu`;
    default:
      return l.type;
  }
}
