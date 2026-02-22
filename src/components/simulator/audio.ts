// src/components/simulator/audio.ts
const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
const buzzerNodes = new Map<string, { osc: OscillatorNode; gain: GainNode }>();

const RAMP_TIME = 0.02;

/** Resume AudioContext if suspended (required after user gesture in many browsers). Call on run or first canvas interaction. */
export function ensureAudioResumed(): Promise<void> {
  if (ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

export function buzzerStart(id: string, freq = 2000, volume = 0.5) {
  if (buzzerNodes.has(id)) return;
  // Must resume before using the context; many browsers block sound until context is running.
  ensureAudioResumed().then(() => {
    if (buzzerNodes.has(id)) return; // stopped while waiting
    if (ctx.state !== 'running' && ctx.state !== 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const vol = Math.max(0, Math.min(1, volume)) * 0.2;
    osc.type = 'square';
    osc.frequency.value = Math.max(100, Math.min(10000, freq));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + RAMP_TIME);
    buzzerNodes.set(id, { osc, gain });
  }).catch(() => {});
}

export function buzzerStop(id: string) {
  const entry = buzzerNodes.get(id);
  if (!entry) return;
  const { osc, gain } = entry;
  buzzerNodes.delete(id);
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
  setTimeout(() => {
    try {
      osc.stop();
    } catch (_) {}
    osc.disconnect();
  }, (RAMP_TIME + 0.01) * 1000);
}
