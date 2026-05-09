/**
 * Audio module — Tone.js metronome and bell completion sound.
 *
 * Usage:
 *   import { initAudio, startMetronome, stopMetronome, playBellSound } from './audio.js';
 *   import { getState } from './state.js';
 */

let metroSynth = null;
let bellSynth = null;
let beat = 0;
let _initialized = false;

/**
 * Initialize Tone.js and create synthesizers.
 * Safe to call multiple times (only creates once).
 */
export async function initAudio() {
  if (_initialized) return;
  await Tone.start();

  metroSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  }).toDestination();

  bellSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 1, sustain: 0, release: 1 }
  }).toDestination();

  // Schedule the metronome pattern
  Tone.Transport.scheduleRepeat((time) => {
    const { isAudioOn } = requireState();
    if (isAudioOn && metroSynth) {
      const freq = beat === 0 ? 'C6' : 'G5';
      metroSynth.triggerAttackRelease(freq, '32n', time);
    }
    beat = (beat + 1) % 4;
  }, '4n');

  _initialized = true;
}

// Inline require to avoid circular deps with state
function requireState() {
  // Dynamic import would be async; instead we use a simple approach:
  // audio.js does NOT import state directly to avoid circular dependency issues.
  // Instead, the caller passes isAudioOn explicitly, OR we use a global reference.
  // We'll use a module-level reference set by app.js.
  return { isAudioOn: _isAudioOn };
}

// Set by app.js to provide audio state without circular imports
export let _isAudioOn = false;
export function setAudioOn(val) {
  _isAudioOn = val;
}

/**
 * Play the bell completion sound (C5, E5, G5 chord).
 */
export function playBellSound() {
  if (!bellSynth) return;
  bellSynth.set({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.6, sustain: 0.1, release: 0.8 },
    volume: -5
  });
  bellSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '2n');
}

/**
 * Start the metronome audio (Transport).
 * @param {number} bpm - beats per minute
 */
export function startMetronome(bpm) {
  beat = 0;
  Tone.Transport.bpm.value = bpm;
  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
}

/**
 * Stop the metronome audio.
 */
export function stopMetronome() {
  Tone.Transport.stop();
  beat = 0;
}

/**
 * Update the BPM on the Transport without restarting.
 */
export function setMetronomeBpm(bpm) {
  Tone.Transport.bpm.value = bpm;
}
