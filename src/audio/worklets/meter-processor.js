class MeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._peak = 0;
    this._sumSq = 0;
    this._count = 0;
    this._clip = false;
    this._framesAcc = 0;
    this._sendIntervalFrames = Math.round(sampleRate * 0.05);
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      this._framesAcc += 128;
      if (this._framesAcc >= this._sendIntervalFrames) {
        this._framesAcc = 0;
        this.port.postMessage({ peak: 0, rms: 0, clip: false });
        this._clip = false;
      }
      return true;
    }
    const channels = input.length;
    const frames = input[0].length;
    let peak = 0, sumSq = 0, clipped = false;
    for (let c = 0; c < channels; c++) {
      const data = input[c];
      for (let i = 0; i < frames; i++) {
        const s = data[i];
        const a = s < 0 ? -s : s;
        if (a > peak) peak = a;
        if (a >= 0.999) clipped = true;
        sumSq += s * s;
      }
    }
    this._peak = Math.max(this._peak, peak);
    this._sumSq += sumSq;
    this._count += channels * frames;
    if (clipped) this._clip = true;
    this._framesAcc += frames;
    if (this._framesAcc >= this._sendIntervalFrames) {
      const avgRms = this._count > 0 ? Math.sqrt(this._sumSq / this._count) : 0;
      this.port.postMessage({ peak: this._peak, rms: avgRms, clip: this._clip });
      this._peak = 0; this._sumSq = 0; this._count = 0;
      this._clip = false; this._framesAcc = 0;
    }
    return true;
  }
}
registerProcessor('meter-processor', MeterProcessor);