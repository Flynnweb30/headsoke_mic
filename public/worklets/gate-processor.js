class GateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -50, minValue: -100, maxValue: 0, automationRate: 'k-rate' },
      { name: 'attack',    defaultValue: 0.005, minValue: 0.0005, maxValue: 0.5, automationRate: 'k-rate' },
      { name: 'release',   defaultValue: 0.15, minValue: 0.01, maxValue: 2.0, automationRate: 'k-rate' },
      { name: 'range',     defaultValue: 40, minValue: 0, maxValue: 80, automationRate: 'k-rate' },
      { name: 'enabled',   defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }
  constructor() { super(); this._env = 0; this._gain = 1; }
  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;
    const enabled = params.enabled[0] >= 0.5;
    const thresholdLin = Math.pow(10, params.threshold[0] / 20);
    const attack  = Math.max(1e-4, params.attack[0]);
    const release = Math.max(1e-3, params.release[0]);
    const rangeLin = Math.pow(10, -params.range[0] / 20);
    const attackCoef  = Math.exp(-1 / (attack  * sampleRate));
    const releaseCoef = Math.exp(-1 / (release * sampleRate));
    const channels = input.length;
    const frames = input[0].length;
    for (let i = 0; i < frames; i++) {
      let rect = 0;
      for (let c = 0; c < channels; c++) {
        const a = Math.abs(input[c][i]);
        if (a > rect) rect = a;
      }
      const envCoef = rect > this._env ? attackCoef : releaseCoef;
      this._env = envCoef * this._env + (1 - envCoef) * rect;
      let targetGain = 1;
      if (enabled && this._env < thresholdLin) targetGain = rangeLin;
      const gCoef = targetGain < this._gain ? attackCoef : releaseCoef;
      this._gain = gCoef * this._gain + (1 - gCoef) * targetGain;
      for (let c = 0; c < channels; c++) output[c][i] = input[c][i] * this._gain;
    }
    return true;
  }
}
registerProcessor('gate-processor', GateProcessor);