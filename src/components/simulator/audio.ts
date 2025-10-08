// src/components/simulator/audio.ts
const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
const oscillators = new Map<string, OscillatorNode>();

export function buzzerStart(id: string, freq = 1000) {
  if (oscillators.has(id)) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.05; // keep it gentle
  osc.type = 'square';
  osc.frequency.value = freq;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  oscillators.set(id, osc);
}

export function buzzerStop(id: string) {
  const osc = oscillators.get(id);
  if (!osc) return;
  try { osc.stop(); } catch {}
  osc.disconnect();
  oscillators.delete(id);
}
