class DeEsserProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 6500, minValue: 3000, maxValue: 10000, automationRate: 'k-rate' },
      { name: 'threshold', defaultValue: -28,  minValue: -60,  maxValue: 0,     automationRate: 'k-rate' },
      { name: 'ratio',     defaultValue: 3,    minValue: 1,    maxValue: 10,    automationRate: 'k-rate' },
      { name: 'enabled',   defaultValue: 1,    minValue: 0,    maxValue: 1,     automationRate: 'k-rate' }
    ];
  }
  constructor() { super(); this._lpState = 0; this._env = 0; }
  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;
    const enabled = params.enabled[0] >= 0.5;
    const freq = params.frequency[0];
    const thresholdLin = Math.pow(10, params.threshold[0] / 20);
    const ratio = Math.max(1, params.ratio[0]);
    const rc = 1 / (2 * Math.PI * freq);
    const dt = 1 / sampleRate;
    const alpha = dt / (rc + dt);
    const envAttack = Math.exp(-1 / (0.001 * sampleRate));
    const envRelease = Math.exp(-1 / (0.05 * sampleRate));
    const channels = input.length;
    const frames = input[0].length;
    for (let c = 0; c < channels; c++) {
      const inData = input[c];
      const outData = output[c];
      let lp = this._lpState;
      for (let i = 0; i < frames; i++) {
        const x = inData[i];
        lp = lp + alpha * (x - lp);
        const low = lp;
        const high = x - low;
        const rect = Math.abs(high);
        const coef = rect > this._env ? envAttack : envRelease;
        this._env = coef * this._env + (1 - coef) * rect;
        let gainHigh = 1;
        if (enabled && this._env > thresholdLin && thresholdLin > 0) {
          const overDb = 20 * Math.log10(this._env / thresholdLin);
          const reduceDb = overDb * (1 - 1 / ratio);
          gainHigh = Math.pow(10, -reduceDb / 20);
        }
        outData[i] = low + high * gainHigh;
      }
      if (c === channels - 1) this._lpState = lp;
    }
    return true;
  }
}
registerProcessor('deesser-processor', DeEsserProcessor);