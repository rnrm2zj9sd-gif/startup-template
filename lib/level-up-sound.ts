// THEMILION SYSTEM — Son de montée de niveau (synthétisé dans le navigateur, aucun fichier audio)
// 4 couches : montée (souffle + note qui grimpe) → impact (basse + explosion) → accord large → cloches.
// À remplacer plus tard par un vrai son signature si besoin : garder la même fonction publique.

import { TIERS } from "./tiers";

const STORAGE_KEY = "themilion:sound";

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let reverbIR: AudioBuffer | null = null;
let noiseBuffer: AudioBuffer | null = null;

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // stockage indisponible : on ignore
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function getReverb(ac: AudioContext): AudioBuffer {
  if (reverbIR) return reverbIR;
  const len = Math.floor(ac.sampleRate * 3.4);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  }
  reverbIR = ir;
  return ir;
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = n;
  return n;
}

function envelope(g: GainNode, t: number, attack: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** Délai (s) entre le début du son et l'impact : à utiliser pour synchroniser l'animation. */
export function impactDelay(big: boolean): number {
  return big ? 1.15 : 0.35;
}

/**
 * Joue le son de montée de niveau.
 * @param tierIndex index du palier atteint (0 = Bronze)
 * @param big true = nouveau palier (version complète), false = simple niveau
 */
export function playLevelUpSound(tierIndex: number, big: boolean): void {
  if (!isSoundEnabled()) return;
  const ac = getContext();
  if (!ac) return;
  try {
    const base = TIERS[Math.max(0, Math.min(TIERS.length - 1, tierIndex))].soundBase;
    const now = ac.currentTime + 0.03;

    const master = ac.createGain();
    master.gain.value = big ? 0.95 : 0.75;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ac.destination);

    const verb = ac.createConvolver();
    verb.buffer = getReverb(ac);
    const wet = ac.createGain();
    wet.gain.value = big ? 0.6 : 0.42;
    verb.connect(wet);
    wet.connect(master);
    const bus = ac.createGain();
    bus.connect(master);
    bus.connect(verb);

    // 1. Montée
    const rise = impactDelay(big);
    const ns = ac.createBufferSource();
    ns.buffer = getNoise(ac);
    ns.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(250, now);
    bp.frequency.exponentialRampToValueAtTime(big ? 7000 : 3800, now + rise);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(big ? 0.32 : 0.16, now + rise * 0.95);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + rise + 0.2);
    ns.connect(bp);
    bp.connect(ng);
    ng.connect(bus);
    ns.start(now);
    ns.stop(now + rise + 0.3);

    if (big) {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(base / 4, now);
      o.frequency.exponentialRampToValueAtTime(base, now + rise);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(300, now);
      lp.frequency.exponentialRampToValueAtTime(3200, now + rise);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + rise);
      g.gain.exponentialRampToValueAtTime(0.0001, now + rise + 0.12);
      o.connect(lp);
      lp.connect(g);
      g.connect(bus);
      o.start(now);
      o.stop(now + rise + 0.2);
    }
    const hit = now + rise;

    // 2. Impact
    const sub = ac.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(big ? 120 : 160, hit);
    sub.frequency.exponentialRampToValueAtTime(36, hit + 0.7);
    const sg = ac.createGain();
    envelope(sg, hit, 0.005, big ? 0.95 : 0.5, big ? 1.2 : 0.5);
    sub.connect(sg);
    sg.connect(master);
    sub.start(hit);
    sub.stop(hit + 1.4);

    const nb = ac.createBufferSource();
    nb.buffer = getNoise(ac);
    const nlp = ac.createBiquadFilter();
    nlp.type = "lowpass";
    nlp.frequency.setValueAtTime(6000, hit);
    nlp.frequency.exponentialRampToValueAtTime(180, hit + 0.45);
    const nbg = ac.createGain();
    envelope(nbg, hit, 0.003, big ? 0.55 : 0.25, 0.45);
    nb.connect(nlp);
    nlp.connect(nbg);
    nbg.connect(bus);
    nb.start(hit);
    nb.stop(hit + 0.6);

    // 3. Accord large
    const chord = big ? [0.5, 1, 1.25, 1.5, 2, 2.5] : [1, 1.5, 2];
    const padLen = big ? 3.4 : 1.4;
    chord.forEach((r) => {
      [-9, 0, 9].forEach((det) => {
        const o = ac.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = base * r;
        o.detune.value = det;
        const lp = ac.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(500, hit);
        lp.frequency.exponentialRampToValueAtTime(big ? 4800 : 2800, hit + 0.4);
        lp.frequency.exponentialRampToValueAtTime(800, hit + padLen);
        const g = ac.createGain();
        envelope(g, hit, 0.04, big ? 0.028 : 0.026, padLen);
        o.connect(lp);
        lp.connect(g);
        g.connect(bus);
        o.start(hit);
        o.stop(hit + padLen + 0.15);
      });
    });

    // 4. Cloches cristallines
    const bells = big ? [2, 2.5, 3, 4, 5, 6, 8] : [3, 4];
    bells.forEach((r, i) => {
      const t = hit + 0.1 + i * (big ? 0.085 : 0.07);
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = base * r;
      const o2 = ac.createOscillator();
      o2.type = "sine";
      o2.frequency.value = base * r * 2.76;
      const g = ac.createGain();
      envelope(g, t, 0.004, 0.11, big ? 1.8 : 0.8);
      const g2 = ac.createGain();
      g2.gain.value = 0.22;
      o.connect(g);
      o2.connect(g2);
      g2.connect(g);
      g.connect(bus);
      o.start(t);
      o2.start(t);
      o.stop(t + 2.2);
      o2.stop(t + 2.2);
    });
  } catch {
    // audio indisponible : l'animation continue sans son
  }
}
