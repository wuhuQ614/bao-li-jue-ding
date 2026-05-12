let audioCtx = null;

export const initAudio = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
};

export const playTone = (freq, type, duration, vol = 0.1) => {
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

let _vibrationEnabled = true;
export const setVibrationEnabledGlobal = (val) => { _vibrationEnabled = val; };
export const vibrate = (pattern) => {
  if (!_vibrationEnabled) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const playTick = () => playTone(800, 'sine', 0.05, 0.05);
export const playWheelTick = () => playTone(1200, 'sine', 0.02, 0.03);

export const playDing = () => {
  playTone(440, 'sine', 0.15, 0.08);
  setTimeout(() => playTone(554, 'sine', 0.2, 0.06), 120);
};

export const playNumberDing = () => {
  playTone(440, 'sine', 0.15, 0.08);
  setTimeout(() => playTone(554, 'sine', 0.2, 0.06), 120);
};

export const playDiceRoll = () => {
  initAudio();
  if (!audioCtx) return;
  const count = 25;
  for (let i = 0; i < count; i++) {
    const t = Math.pow(i / count, 0.7) * 2500 + Math.random() * 50;
    setTimeout(() => {
      const bufferSize = audioCtx.sampleRate * 0.02;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.15));
      }
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000 + Math.random() * 2000;
      filter.Q.value = 0.8 + Math.random() * 0.5;
      const gain = audioCtx.createGain();
      const vol = 0.08 + Math.random() * 0.12;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start();
    }, t);
  }
};

export const playThud = () => {
  playTone(440, 'sine', 0.15, 0.08);
  setTimeout(() => playTone(554, 'sine', 0.2, 0.06), 120);
};
