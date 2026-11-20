// Sound from nothing but oscillators and filtered noise: an engine hum that
// follows the car's speed, police sirens that wail while the heat is on, horns,
// gunshots, chimes and jingles. No audio files. The context stays locked until
// the player's first key or click, as browsers require; M mutes everything.

export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenPhase = 0;

  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor === undefined) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);

    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineOsc.connect(engineFilter).connect(engineGain).connect(master);
    engineOsc.start();

    sirenOsc = context.createOscillator();
    sirenOsc.type = 'triangle';
    sirenGain = context.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(master);
    sirenOsc.start();
  }

  /** A short tone blip; the building block for horns, chimes and jingles. */
  function blip(freq, seconds, type = 'square', volume = 0.16, slideTo = 0) {
    if (context === null || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  /** A burst of white noise; the building block for gunshots and crashes. */
  function noise(seconds, volume, filterFreq) {
    if (context === null || muted) return;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(master);
    source.start();
  }

  return {
    unlock,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** Called every frame: engine pitch follows speed, the siren wails while police are close. */
    update(dt, engineSpeed, sirenLevel) {
      if (context === null) return;
      const now = context.currentTime;
      const target = muted ? 0 : Math.min(0.14, Math.abs(engineSpeed) / 345) * 0.14;
      engineGain.gain.setTargetAtTime(target, now, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(engineSpeed) * 0.55, now, 0.08);
      sirenPhase += dt * 2.4;
      const wail = 660 + Math.sin(sirenPhase * Math.PI) * 190;
      sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
      sirenGain.gain.setTargetAtTime(muted ? 0 : sirenLevel * 0.05, now, 0.15);
    },
    shot() { noise(0.11, 0.5, 2600); blip(150, 0.07, 'square', 0.2, 60); },
    dryFire() { blip(1200, 0.03, 'square', 0.08); },
    reload() { blip(500, 0.05, 'square', 0.1); setTimeout(() => blip(700, 0.05, 'square', 0.1), 90); },
    horn() { blip(370, 0.22, 'square', 0.1); blip(466, 0.22, 'square', 0.08); },
    crash(strength) { noise(0.18, Math.min(0.5, 0.15 + strength * 0.05), 900); },
    chime() { blip(880, 0.12, 'sine', 0.18); setTimeout(() => blip(1318, 0.18, 'sine', 0.18), 90); },
    cash() { blip(988, 0.08, 'square', 0.14); setTimeout(() => blip(1319, 0.16, 'square', 0.14), 70); },
    fail() { blip(220, 0.3, 'sawtooth', 0.14, 110); },
    missionDone() {
      blip(523, 0.12, 'square', 0.14);
      setTimeout(() => blip(659, 0.12, 'square', 0.14), 110);
      setTimeout(() => blip(784, 0.22, 'square', 0.16), 220);
    },
  };
}
