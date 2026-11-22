// Velvet Vault — all sound is synthesized with WebAudio: no audio files, no network.
// A quiet blip for loot, a ticking crack, a siren that swells with the alarm, a sting
// for getting busted and a little arpeggio for the getaway.

export function createAudio() {
  let context = null;
  let muted = false;
  let siren = null;
  let sirenGain = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    const ac = ensure();
    if (!ac || muted) return;
    const start = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function unlock() {
    const ac = ensure();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  }

  function startSiren() {
    const ac = ensure();
    if (!ac || muted || siren) return;
    siren = ac.createOscillator();
    siren.type = 'sawtooth';
    siren.frequency.setValueAtTime(620, ac.currentTime);
    sirenGain = ac.createGain();
    sirenGain.gain.setValueAtTime(0.0001, ac.currentTime);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 2.2;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(siren.frequency);
    siren.connect(sirenGain);
    sirenGain.connect(ac.destination);
    siren.start();
    lfo.start();
    siren._lfo = lfo;
  }

  function setSiren(level) {
    if (!siren || !sirenGain) return;
    const ac = context;
    if (!ac) return;
    sirenGain.gain.setTargetAtTime(muted ? 0.0001 : 0.02 + level * 0.05, ac.currentTime, 0.1);
  }

  function stopSiren() {
    if (!siren) return;
    try {
      siren._lfo.stop();
      siren.stop();
    } catch {
      // already stopped
    }
    siren = null;
    sirenGain = null;
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (muted) stopSiren();
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    loot() {
      tone(880, 0.1, 'sine', 0.16);
      tone(1318, 0.14, 'sine', 0.14, 0.07);
    },
    keycard() {
      tone(1046, 0.08, 'square', 0.08);
      tone(1568, 0.1, 'square', 0.07, 0.08);
    },
    crackTick() {
      tone(2200, 0.03, 'square', 0.05);
    },
    crackDone() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.09));
    },
    denied() {
      tone(180, 0.18, 'sawtooth', 0.1, 0, 120);
    },
    spotted() {
      tone(740, 0.09, 'square', 0.09);
      tone(740, 0.09, 'square', 0.09, 0.12);
    },
    busted() {
      [392, 311, 233, 155].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.12, i * 0.16));
    },
    getaway() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, i * 0.1));
    },
    sirenTick(level) {
      if (level > 0.55) startSiren();
      else if (level < 0.4) stopSiren();
      setSiren(level);
    },
    stopSiren,
  };
}
