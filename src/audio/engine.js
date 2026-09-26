import { PRESETS } from './presets.js';

export class AudioEngine {
  constructor() {
    this.ctx = null; this.stream = null; this.source = null;
    this.monitorEl = null; this.started = false; this.bypassed = false;
    this.workletsLoaded = false; this.preset = 'clean';
    this.nodes = null; this._bypassTap = null;
    this.listeners = {
      meterIn: new Set(), meterOut: new Set(), clip: new Set(),
      state: new Set(), error: new Set(), activity: new Set()
    };
  }
  on(event, cb) { this.listeners[event].add(cb); return () => this.listeners[event].delete(cb); }
  _emit(event, payload) { for (const cb of this.listeners[event]) cb(payload); }
  _emitError(msg) { this._emit('error', msg); }

  static get support() {
    const hasAC = typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function';
    const ACProto = hasAC ? (window.AudioContext || window.webkitAudioContext).prototype : null;
    return {
      audioContext: hasAC,
      audioWorklet: !!(ACProto && 'audioWorklet' in ACProto),
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      setSinkId: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
      isSecure: window.isSecureContext
    };
  }

  async listDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return { inputs: [], outputs: [] };
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: devices.filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || ('Microphone ' + d.deviceId.slice(0, 6)) })),
      outputs: devices.filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || ('Output ' + d.deviceId.slice(0, 6)) }))
    };
  }

  async _ensureContext() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  async _loadWorklets() {
    if (this.workletsLoaded) return;
    const ctx = await this._ensureContext();
    const paths = [
      '/worklets/meter-processor.js',
      '/worklets/gate-processor.js',
      '/worklets/deesser-processor.js'
    ];
    for (const p of paths) {
      try {
        await ctx.audioWorklet.addModule(p);
      } catch (err) {
        throw new Error('Failed to load AudioWorklet module: ' + p + ' (' + err.message + ')');
      }
    }
    this.workletsLoaded = true;
  }

  async start(deviceId) {
    if (this.started) return;
    try {
      const ctx = await this._ensureContext();
      await this._loadWorklets();
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false, noiseSuppression: false,
          autoGainControl: false, channelCount: 1
        },
        video: false
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._attachStreamEndedHandler();
      this.source = ctx.createMediaStreamSource(this.stream);

      this.nodes = {
        inputGain: ctx.createGain(),
        hpf: ctx.createBiquadFilter(),
        gate: new AudioWorkletNode(ctx, 'gate-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }),
        eq: [0,1,2,3,4].map(() => ctx.createBiquadFilter()),
        deesser: new AudioWorkletNode(ctx, 'deesser-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }),
        comp: ctx.createDynamicsCompressor(),
        presence: ctx.createBiquadFilter(),
        dry: ctx.createGain(), wetIn: ctx.createGain(),
        delay: ctx.createDelay(1.5), delayFb: ctx.createGain(), delayWet: ctx.createGain(),
        convolver: ctx.createConvolver(), reverbWet: ctx.createGain(),
        merge: ctx.createGain(),
        limiter: ctx.createDynamicsCompressor(),
        outputGain: ctx.createGain(),
        meterInNode: new AudioWorkletNode(ctx, 'meter-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }),
        meterOutNode: new AudioWorkletNode(ctx, 'meter-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] })
      };
      this._configureStaticNodeParams();
      this._buildTopologyRefs();
      this._applyPreset(PRESETS[this.preset]);
      this._wireMeters();
      this.dest = ctx.createMediaStreamDestination();
      this.nodes.outputGain.connect(this.dest);
      this.monitorEl = document.createElement('audio');
      this.monitorEl.autoplay = true;
      this.monitorEl.playsInline = true;
      this.monitorEl.srcObject = this.dest.stream;
      this.nodes.outputGain.connect(ctx.destination);
      this.started = true; this.bypassed = false;
      this._emit('state', { started: true, bypassed: this.bypassed });
    } catch (err) {
      this._emitError(this._friendlyError(err));
      throw err;
    }
  }

  _configureStaticNodeParams() {
    const n = this.nodes;
    n.hpf.type = 'highpass'; n.hpf.frequency.value = 90; n.hpf.Q.value = 0.7;
    const eqTypes = ['lowshelf','peaking','peaking','peaking','highshelf'];
    const eqFreqs = [120, 400, 1000, 3000, 8000];
    const eqQ     = [0.7, 1.0, 1.0, 1.0, 0.7];
    n.eq.forEach((f, i) => {
      f.type = eqTypes[i]; f.frequency.value = eqFreqs[i];
      if (eqTypes[i] === 'peaking') f.Q.value = eqQ[i];
      f.gain.value = 0;
    });
    n.presence.type = 'peaking'; n.presence.frequency.value = 4500;
    n.presence.Q.value = 1.0; n.presence.gain.value = 0;
    n.comp.threshold.value = -20; n.comp.knee.value = 10;
    n.comp.ratio.value = 3; n.comp.attack.value = 0.008; n.comp.release.value = 0.18;
    n.limiter.threshold.value = -1; n.limiter.knee.value = 0; n.limiter.ratio.value = 20;
    n.limiter.attack.value = 0.001; n.limiter.release.value = 0.05;
    n.delay.delayTime.value = 0.25; n.delayFb.gain.value = 0.25;
    n.delayWet.gain.value = 0; n.reverbWet.gain.value = 0;
    n.dry.gain.value = 1; n.wetIn.gain.value = 0; n.merge.gain.value = 1;
  }

  _buildTopologyRefs() {
    const n = this.nodes;
    this.source.connect(n.inputGain);
    n.inputGain.connect(n.meterInNode);
    n.inputGain.connect(n.hpf);
    n.hpf.connect(n.gate);
    n.gate.connect(n.eq[0]);
    for (let i = 0; i < n.eq.length - 1; i++) n.eq[i].connect(n.eq[i + 1]);
    n.eq[n.eq.length - 1].connect(n.deesser);
    n.deesser.connect(n.comp);
    n.comp.connect(n.presence);
    n.presence.connect(n.dry); n.dry.connect(n.merge);
    n.presence.connect(n.wetIn);
    n.wetIn.connect(n.delay);
    n.delay.connect(n.delayFb); n.delayFb.connect(n.delay);
    n.delay.connect(n.delayWet); n.delayWet.connect(n.merge);
    n.wetIn.connect(n.convolver);
    n.convolver.connect(n.reverbWet); n.reverbWet.connect(n.merge);
    n.merge.connect(n.limiter);
    n.limiter.connect(n.outputGain);
    n.outputGain.connect(n.meterOutNode);
  }

  _wireMeters() {
    this.nodes.meterInNode.port.onmessage = (e) => {
      this._emit('meterIn', e.data);
      this._emit('activity', { stage: 'input', level: e.data.rms });
    };
    this.nodes.meterOutNode.port.onmessage = (e) => {
      this._emit('meterOut', e.data);
      this._emit('activity', { stage: 'output', level: e.data.rms });
      if (e.data.clip) this._emit('clip', { at: performance.now() });
    };
  }

  _attachStreamEndedHandler() {
    if (!this.stream) return;
    for (const t of this.stream.getAudioTracks()) {
      t.addEventListener('ended', () => {
        this._emit('state', { started: false, reason: 'track-ended' });
        this.stop();
      });
    }
  }

  applyPreset(key) {
    if (!PRESETS[key]) return;
    this.preset = key;
    if (this.started) this._applyPreset(PRESETS[key]);
  }

  _applyPreset(p) {
    const n = this.nodes;
    const t = this.ctx.currentTime;
    const ramp = (param, value, dur) => {
      if (!param || typeof param.setTargetAtTime !== 'function') return;
      const d = (typeof dur === 'number') ? dur : 0.05;
      param.cancelScheduledValues(t);
      param.setTargetAtTime(value, t, d);
    };
    ramp(n.inputGain.gain,  Math.pow(10, p.inputGain / 20));
    ramp(n.outputGain.gain, Math.pow(10, p.outputGain / 20));
    ramp(n.hpf.frequency, p.hpf);
    const lpfGain = p.lpf >= 19000 ? 0 : -12;
    ramp(n.eq[4].gain, p.eq[4] + lpfGain);
    for (let i = 0; i < 4; i++) ramp(n.eq[i].gain, p.eq[i]);
    ramp(n.gate.parameters.get('threshold'), p.gate.threshold);
    ramp(n.gate.parameters.get('attack'),    p.gate.attack);
    ramp(n.gate.parameters.get('release'),   p.gate.release);
    ramp(n.gate.parameters.get('range'),     p.gate.range);
    ramp(n.gate.parameters.get('enabled'),   p.gate.enabled ? 1 : 0);
    ramp(n.comp.threshold, p.comp.enabled ? p.comp.threshold : 0);
    ramp(n.comp.knee,      p.comp.enabled ? p.comp.knee : 0);
    ramp(n.comp.ratio,     p.comp.enabled ? p.comp.ratio : 1);
    ramp(n.comp.attack,    p.comp.attack);
    ramp(n.comp.release,   p.comp.release);
    ramp(n.deesser.parameters.get('frequency'), p.deess.frequency);
    ramp(n.deesser.parameters.get('threshold'), p.deess.threshold);
    ramp(n.deesser.parameters.get('ratio'),     p.deess.ratio);
    ramp(n.deesser.parameters.get('enabled'),   p.deess.enabled ? 1 : 0);
    ramp(n.presence.gain, p.presence.enabled ? p.presence.gain : 0);
    ramp(n.delay.delayTime, p.delay.time);
    ramp(n.delayFb.gain,    p.delay.feedback);
    ramp(n.delayWet.gain,   p.delay.enabled ? p.delay.mix : 0);
    if (p.reverb.enabled) { this._setReverbImpulse(p.reverb.decay); ramp(n.reverbWet.gain, p.reverb.mix); }
    else ramp(n.reverbWet.gain, 0);
    ramp(n.dry.gain,  p.dryWet);
    ramp(n.wetIn.gain, p.dryWet);
    ramp(n.limiter.threshold, p.limiter.enabled ? p.limiter.threshold : 0);
    ramp(n.limiter.ratio,     p.limiter.enabled ? 20 : 1);
    ramp(n.limiter.release,   p.limiter.release);
  }

  _setReverbImpulse(decaySeconds) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * decaySeconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const n = (Math.random() * 2 - 1);
        const env = Math.pow(1 - i / len, 2.2);
        d[i] = n * env * 0.6;
      }
    }
    this.nodes.convolver.buffer = buf;
  }

  setInputGainDb(db)  { this._rampParam('inputGain.gain', Math.pow(10, db / 20)); }
  setOutputGainDb(db) { this._rampParam('outputGain.gain', Math.pow(10, db / 20)); }
  setHpf(freq)        { this._rampParam('hpf.frequency', freq); }
  setEqGain(i, db)    { this._rampParam('eq.' + i + '.gain', db); }
  setGate(param, val) { this._rampParam('gate.parameters.' + param, val); }
  setComp(param, val) { this._rampParam('comp.' + param, val); }
  setDeess(param, val){ this._rampParam('deesser.parameters.' + param, val); }
  setPresence(db)     { this._rampParam('presence.gain', db); }
  setDelayTime(s)     { this._rampParam('delay.delayTime', s); }
  setDelayFb(v)       { this._rampParam('delayFb.gain', v); }
  setDelayMix(v)      { this._rampParam('delayWet.gain', v); }
  setReverbMix(v)     { this._rampParam('reverbWet.gain', v); }
  setReverbDecay(s)   { if (this.started) this._setReverbImpulse(s); }
  setDryWet(v)        { this._rampParam('dry.gain', v); this._rampParam('wetIn.gain', v); }
  setLimiterThreshold(db) { this._rampParam('limiter.threshold', db); }

  _rampParam(path, value) {
    if (!this.started || !this.nodes) return;
    const parts = path.split('.');
    let obj = this.nodes;
    for (let i = 0; i < parts.length - 1; i++) { if (obj == null) return; obj = obj[parts[i]]; }
    const param = obj ? obj[parts[parts.length - 1]] : null;
    if (!param || typeof param.setTargetAtTime !== 'function') return;
    const t = this.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(value, t, 0.02);
  }

  setBypass(bypassed) {
    const next = !!bypassed;
    if (next === this.bypassed) {
      this._emit('state', { started: this.started, bypassed: this.bypassed });
      return;
    }
    if (this.started && this.nodes) {
      if (next) {
        if (!this._bypassTap) {
          this._bypassTap = this.ctx.createGain();
          this._bypassTap.gain.value = 0;
          this.nodes.inputGain.connect(this._bypassTap);
          this._bypassTap.connect(this.nodes.outputGain);
        }
        this._bypassTap.gain.value = 1;
        this.nodes.merge.gain.value = 0;
      } else {
        if (this._bypassTap) this._bypassTap.gain.value = 0;
        this.nodes.merge.gain.value = 1;
      }
    }
    this.bypassed = next;
    this._emit('state', { started: this.started, bypassed: this.bypassed });
  }

  async setOutputDevice(deviceId) {
    if (!AudioEngine.support.setSinkId) {
      this._emitError('setSinkId is not supported in this browser. Using system default output only.');
      return false;
    }
    try {
      if (this.monitorEl && typeof this.monitorEl.setSinkId === 'function') {
        await this.monitorEl.setSinkId(deviceId || '');
      }
      return true;
    } catch (err) {
      this._emitError('Unable to switch output device: ' + err.message);
      return false;
    }
  }

  stop() {
    if (!this.started) return;
    try { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try {
      if (this.source) this.source.disconnect();
      if (this.nodes) {
        Object.values(this.nodes).forEach(n => {
          if (Array.isArray(n)) n.forEach(x => { try { x.disconnect(); } catch (e) {} });
          else if (n && typeof n.disconnect === 'function') { try { n.disconnect(); } catch (e) {} }
        });
      }
      if (this._bypassTap) { try { this._bypassTap.disconnect(); } catch (e) {} }
    } catch (e) {}
    if (this.monitorEl) { try { this.monitorEl.pause(); this.monitorEl.srcObject = null; } catch (e) {} }
    this.stream = null; this.source = null; this.nodes = null; this._bypassTap = null;
    this.started = false; this.bypassed = false;
    this._emit('state', { started: false, bypassed: this.bypassed });
  }

  async suspend() {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
    this._emit('state', { started: this.started, bypassed: this.bypassed, suspended: true });
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
    this._emit('state', { started: this.started, bypassed: this.bypassed, suspended: false });
  }

  async close() {
    this.stop();
    if (this.ctx) {
      try { await this.ctx.close(); } catch (e) {}
      this.ctx = null; this.workletsLoaded = false;
    }
  }

  _friendlyError(err) {
    const name = err && err.name ? err.name : '';
    if (name === 'NotAllowedError') return 'Microphone permission was denied. Grant access and try again.';
    if (name === 'NotFoundError') return 'No microphone found. Connect a USB headset and retry.';
    if (name === 'NotReadableError') return 'Microphone is in use by another application.';
    if (name === 'OverconstrainedError') return 'Selected microphone is unavailable. Choose another device.';
    if (name === 'SecurityError') return 'Microphone access requires HTTPS or localhost.';
    return (err && err.message) ? err.message : 'Unknown audio error.';
  }
}