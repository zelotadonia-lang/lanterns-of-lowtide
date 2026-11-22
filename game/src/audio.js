// Sound: tiny synthesized WebAudio blips. No audio files, no network.
// Mute persists in memory only; the game starts quiet until a first click.

let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when) {
  const ac = ensureCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + (when || 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playDeal() {
  tone(520, 0.09, 'triangle', 0.08, 0);
  tone(660, 0.09, 'triangle', 0.08, 0.07);
}

export function playCardSound() {
  tone(392, 0.12, 'triangle', 0.12, 0);
  tone(523, 0.14, 'triangle', 0.1, 0.08);
}

export function playSurge() {
  tone(659, 0.1, 'square', 0.06, 0);
  tone(880, 0.16, 'square', 0.06, 0.09);
}

export function playPass() {
  tone(220, 0.15, 'sine', 0.08, 0);
}

export function playRoundWin() {
  tone(523, 0.12, 'triangle', 0.12, 0);
  tone(659, 0.12, 'triangle', 0.12, 0.1);
  tone(784, 0.22, 'triangle', 0.12, 0.2);
}

export function playWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.12));
}

export function playLoss() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, i * 0.16));
}
