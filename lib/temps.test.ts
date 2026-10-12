import assert from "node:assert/strict";
import { test } from "node:test";
import { debutJourLocal, finJourLocal, jourLocal } from "./temps";

const PARIS = "Europe/Paris";

test("23 h 30 à Paris le 11/10 donne le 11/10 (21 h 30 UTC)", () => {
  const date = new Date("2026-10-11T21:30:00.000Z");
  assert.equal(jourLocal(date, PARIS), "2026-10-11");
});

test("00 h 30 à Paris le 12/10 donne le 12/10", () => {
  const date = new Date("2026-10-11T22:30:00.000Z");
  assert.equal(jourLocal(date, PARIS), "2026-10-12");
  assert.equal(date.toISOString().slice(0, 10), "2026-10-11");
});

test("changement d'heure du 25/10/2026 : le jour local reste le 25", () => {
  // 00:30 CEST (UTC+2) le 25/10
  assert.equal(jourLocal(new Date("2026-10-24T22:30:00.000Z"), PARIS), "2026-10-25");
  // 02:30 CEST, encore avant le recul (01:00 UTC = 03:00 → 02:00)
  assert.equal(jourLocal(new Date("2026-10-25T00:30:00.000Z"), PARIS), "2026-10-25");
  // 02:30 CET après le recul (UTC+1)
  assert.equal(jourLocal(new Date("2026-10-25T01:30:00.000Z"), PARIS), "2026-10-25");
  // 03:30 CET
  assert.equal(jourLocal(new Date("2026-10-25T02:30:00.000Z"), PARIS), "2026-10-25");
});

test("debutJourLocal / finJourLocal à Paris hors DST", () => {
  const date = new Date("2026-10-11T21:30:00.000Z");
  const debut = debutJourLocal(date, PARIS);
  const fin = finJourLocal(date, PARIS);

  assert.equal(jourLocal(debut, PARIS), "2026-10-11");
  assert.equal(debut.toISOString(), "2026-10-10T22:00:00.000Z");
  assert.equal(jourLocal(fin, PARIS), "2026-10-11");
  assert.equal(fin.toISOString(), "2026-10-11T21:59:59.999Z");
});

test("le 25/10/2026 à Paris dure 25 heures (recul d'une heure)", () => {
  const date = new Date("2026-10-25T12:00:00.000Z");
  const debut = debutJourLocal(date, PARIS);
  const fin = finJourLocal(date, PARIS);
  const dureeH = (fin.getTime() + 1 - debut.getTime()) / 3600000;

  assert.equal(debut.toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(dureeH, 25);
  assert.equal(jourLocal(new Date(fin.getTime() + 1), PARIS), "2026-10-26");
});
