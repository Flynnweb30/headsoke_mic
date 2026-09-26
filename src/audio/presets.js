export const PRESETS = {
  flat: {
    label: 'Flat (clean pass)', inputGain: 0, outputGain: 0, hpf: 20, lpf: 20000,
    eq: [0, 0, 0, 0, 0],
    gate: { enabled: false, threshold: -60, attack: 0.005, release: 0.2, range: 40 },
    comp: { enabled: false, threshold: -18, knee: 12, ratio: 3, attack: 0.01, release: 0.2 },
    deess: { enabled: false, frequency: 6500, threshold: -28, ratio: 3 },
    presence: { enabled: false, gain: 0 },
    delay: { enabled: false, time: 0.25, feedback: 0.25, mix: 0.15 },
    reverb: { enabled: false, mix: 0.15, decay: 1.8 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  },
  clean: {
    label: 'Clean Vocal', inputGain: 6, outputGain: 0, hpf: 90, lpf: 16000,
    eq: [-1, 0, 0, 1.5, 1],
    gate: { enabled: true, threshold: -48, attack: 0.003, release: 0.15, range: 40 },
    comp: { enabled: true, threshold: -20, knee: 10, ratio: 2.5, attack: 0.008, release: 0.18 },
    deess: { enabled: true, frequency: 6500, threshold: -30, ratio: 3 },
    presence: { enabled: true, gain: 2.5 },
    delay: { enabled: false, time: 0.25, feedback: 0.25, mix: 0.15 },
    reverb: { enabled: true, mix: 0.08, decay: 1.5 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  },
  singing: {
    label: 'Singing', inputGain: 8, outputGain: 0, hpf: 80, lpf: 18000,
    eq: [-2, -1, 0.5, 2.5, 2],
    gate: { enabled: true, threshold: -45, attack: 0.002, release: 0.12, range: 30 },
    comp: { enabled: true, threshold: -22, knee: 8, ratio: 3.5, attack: 0.006, release: 0.15 },
    deess: { enabled: true, frequency: 6500, threshold: -28, ratio: 4 },
    presence: { enabled: true, gain: 4 },
    delay: { enabled: true, time: 0.22, feedback: 0.22, mix: 0.12 },
    reverb: { enabled: true, mix: 0.22, decay: 2.2 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  },
  studio: {
    label: 'Studio', inputGain: 6, outputGain: 0, hpf: 100, lpf: 16000,
    eq: [-1.5, -0.5, 0, 2, 1.5],
    gate: { enabled: true, threshold: -50, attack: 0.003, release: 0.2, range: 45 },
    comp: { enabled: true, threshold: -24, knee: 14, ratio: 3, attack: 0.01, release: 0.25 },
    deess: { enabled: true, frequency: 6800, threshold: -32, ratio: 3.5 },
    presence: { enabled: true, gain: 3 },
    delay: { enabled: false, time: 0.3, feedback: 0.2, mix: 0.1 },
    reverb: { enabled: true, mix: 0.12, decay: 1.6 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  },
  warm: {
    label: 'Warm Vocal', inputGain: 7, outputGain: 0, hpf: 70, lpf: 14000,
    eq: [2, 1.5, 0.5, 0, -1],
    gate: { enabled: true, threshold: -46, attack: 0.004, release: 0.18, range: 35 },
    comp: { enabled: true, threshold: -22, knee: 12, ratio: 3, attack: 0.012, release: 0.22 },
    deess: { enabled: true, frequency: 6200, threshold: -28, ratio: 3 },
    presence: { enabled: true, gain: 1.5 },
    delay: { enabled: false, time: 0.28, feedback: 0.25, mix: 0.12 },
    reverb: { enabled: true, mix: 0.2, decay: 2.0 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  },
  clear: {
    label: 'Clear Voice', inputGain: 6, outputGain: 0, hpf: 110, lpf: 17000,
    eq: [-2, -1, 0.5, 3, 2],
    gate: { enabled: true, threshold: -48, attack: 0.002, release: 0.14, range: 40 },
    comp: { enabled: true, threshold: -20, knee: 8, ratio: 3, attack: 0.006, release: 0.16 },
    deess: { enabled: true, frequency: 6500, threshold: -30, ratio: 3.5 },
    presence: { enabled: true, gain: 3.5 },
    delay: { enabled: false, time: 0.22, feedback: 0.2, mix: 0.1 },
    reverb: { enabled: true, mix: 0.06, decay: 1.4 },
    limiter: { enabled: true, threshold: -1, release: 0.05 },
    dryWet: 1
  }
};
export const PRESET_KEYS = Object.keys(PRESETS);