import { Meter } from './meters.js';
import { slider, toggle } from './controls.js';
import { PRESETS, PRESET_KEYS } from '../audio/presets.js';

export function buildApp(root, engine) {
  root.innerHTML = [
    '<header class="app-header">',
    '  <h1>Headsoke</h1>',
    '  <div class="sub">Real-time singing microphone processor - runs entirely in your browser</div>',
    '  <div id="status-bar" class="status-bar"></div>',
    '</header>',
    '<section class="grid-top">',
    '  <div class="card">',
    '    <h2>Devices</h2>',
    '    <div class="row"><label class="stack"><span>Input microphone</span><select id="input-select"></select></label></div>',
    '    <div class="row"><label class="stack"><span>Output device</span><select id="output-select"></select></label></div>',
    '    <div id="output-note" class="note"></div>',
    '    <div class="row actions">',
    '      <button id="refresh-devices" class="btn">Refresh devices</button>',
    '      <button id="start-btn" class="btn btn-primary">Start</button>',
    '      <button id="stop-btn" class="btn btn-danger" disabled>Stop</button>',
    '      <button id="bypass-btn" class="btn" disabled>Bypass: off</button>',
    '      <button id="reset-btn" class="btn">Reset</button>',
    '    </div>',
    '    <div id="error-box" class="error hidden"></div>',
    '  </div>',
    '  <div class="card">',
    '    <h2>Levels</h2>',
    '    <div class="meters">',
    '      <div class="meter-block"><div class="meter-label">Input</div><canvas id="meter-in" class="meter-canvas"></canvas></div>',
    '      <div class="meter-block"><div class="meter-label">Output</div><canvas id="meter-out" class="meter-canvas"></canvas></div>',
    '    </div>',
    '    <div class="clip-row"><span id="clip-indicator" class="clip-light">CLIP</span><span id="engine-state" class="state-pill">Engine: idle</span></div>',
    '    <div class="row"><label class="stack"><span>Master output (dB)</span><input id="master-out" type="range" min="-24" max="12" step="0.5" value="0" /></label></div>',
    '  </div>',
    '  <div class="card">',
    '    <h2>Preset</h2>',
    '    <div class="row"><label class="stack"><span>Active preset</span><select id="preset-select"></select></label></div>',
    '    <div class="note">Presets overwrite all DSP parameters below. Adjust any control afterwards to create a custom state.</div>',
    '  </div>',
    '</section>',
    '<section class="grid-dsp">',
    '  <div class="card"><h2>Input &amp; Filters</h2><div id="input-controls"></div></div>',
    '  <div class="card"><h2>EQ (5-band)</h2><div id="eq-controls"></div></div>',
    '  <div class="card"><h2>Dynamics</h2><div id="dyn-controls"></div></div>',
    '  <div class="card"><h2>Space &amp; Mix</h2><div id="space-controls"></div></div>',
    '</section>',
    '<footer class="app-footer">',
    '  <div><strong>Limitations:</strong> A browser cannot create a system-wide virtual microphone. To use this in Zoom/OBS/Discord, install a virtual audio cable (e.g. VB-CABLE on Windows) and route your system output to it.</div>',
    '</footer>'
  ].join('\n');

  const $ = (id) => root.querySelector('#' + id);
  const inputSelect  = $('input-select');
  const outputSelect = $('output-select');
  const outputNote   = $('output-note');
  const startBtn     = $('start-btn');
  const stopBtn      = $('stop-btn');
  const bypassBtn    = $('bypass-btn');
  const resetBtn     = $('reset-btn');
  const refreshBtn   = $('refresh-devices');
  const errorBox     = $('error-box');
  const presetSelect = $('preset-select');
  const masterOut    = $('master-out');
  const statePill    = $('engine-state');
  const clipLight    = $('clip-indicator');

  const meterIn  = new Meter($('meter-in'),  { color: '#63e6be' });
  const meterOut = new Meter($('meter-out'), { color: '#4cc9f0' });

  const support = engine.constructor.support;
  if (!support.isSecure) showError('Microphone requires a secure context (HTTPS or http://localhost).');
  if (!support.audioWorklet) showError('AudioWorklet is not supported in this browser. Core DSP will not run.');
  if (!support.setSinkId) {
    outputNote.textContent = 'Output device selection is not supported in this browser. Using system default.';
    outputSelect.disabled = true;
  }

  for (let i = 0; i < PRESET_KEYS.length; i++) {
    const key = PRESET_KEYS[i];
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = PRESETS[key].label;
    presetSelect.appendChild(opt);
  }
  presetSelect.value = engine.preset;
  presetSelect.addEventListener('change', () => {
    engine.applyPreset(presetSelect.value);
    syncControlsFromPreset(PRESETS[presetSelect.value]);
  });

  const ctrlInput = $('input-controls');
  const ctrlEq    = $('eq-controls');
  const ctrlDyn   = $('dyn-controls');
  const ctrlSpace = $('space-controls');

  const inputGain = slider({ label: 'Input gain', min: -12, max: 24, step: 0.5, value: 6, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setInputGainDb(v); } });
  const hpf = slider({ label: 'High-pass', min: 20, max: 400, step: 5, value: 90, unit: 'Hz',
    onInput: (v) => { markCustom(); engine.setHpf(v); } });
  ctrlInput.appendChild(inputGain); ctrlInput.appendChild(hpf);

  const eqLabels = ['Low shelf', 'Low-mid', 'Mid', 'High-mid', 'High shelf'];
  const eqControls = eqLabels.map((lab, i) => slider({
    label: lab, min: -12, max: 12, step: 0.5, value: 0, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setEqGain(i, v); }
  }));
  eqControls.forEach(c => ctrlEq.appendChild(c));

  const gateEnabled = toggle({ label: 'Noise gate enabled', value: true,
    onChange: (v) => { markCustom(); engine.setGate('enabled', v ? 1 : 0); } });
  const gateThresh = slider({ label: 'Gate threshold', min: -80, max: -10, step: 1, value: -48, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setGate('threshold', v); } });
  const gateRange = slider({ label: 'Gate depth', min: 0, max: 80, step: 1, value: 40, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setGate('range', v); } });
  const compEnabled = toggle({ label: 'Compressor enabled', value: true,
    onChange: (v) => { markCustom(); engine.setComp('ratio', v ? 3 : 1); } });
  const compThresh = slider({ label: 'Comp threshold', min: -60, max: 0, step: 1, value: -20, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setComp('threshold', v); } });
  const compRatio = slider({ label: 'Comp ratio', min: 1, max: 20, step: 0.5, value: 3, unit: 'x',
    onInput: (v) => { markCustom(); engine.setComp('ratio', v); } });
  const deessEnabled = toggle({ label: 'De-esser enabled', value: true,
    onChange: (v) => { markCustom(); engine.setDeess('enabled', v ? 1 : 0); } });
  const deessFreq = slider({ label: 'De-esser freq', min: 3000, max: 10000, step: 100, value: 6500, unit: 'Hz',
    onInput: (v) => { markCustom(); engine.setDeess('frequency', v); } });
  const deessThresh = slider({ label: 'De-esser threshold', min: -60, max: 0, step: 1, value: -28, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setDeess('threshold', v); } });
  const limiterThresh = slider({ label: 'Limiter threshold', min: -12, max: 0, step: 0.5, value: -1, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setLimiterThreshold(v); } });
  [gateEnabled, gateThresh, gateRange, compEnabled, compThresh, compRatio,
   deessEnabled, deessFreq, deessThresh, limiterThresh].forEach(c => ctrlDyn.appendChild(c));

  const presence = slider({ label: 'Presence', min: 0, max: 12, step: 0.5, value: 2.5, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setPresence(v); } });
  const delayTime = slider({ label: 'Delay time', min: 0.02, max: 1.0, step: 0.01, value: 0.25, unit: 's',
    onInput: (v) => { markCustom(); engine.setDelayTime(v); } });
  const delayFb = slider({ label: 'Delay feedback', min: 0, max: 0.85, step: 0.01, value: 0.25, unit: '%',
    onInput: (v) => { markCustom(); engine.setDelayFb(v); } });
  const delayMix = slider({ label: 'Delay mix', min: 0, max: 1, step: 0.01, value: 0.0, unit: '%',
    onInput: (v) => { markCustom(); engine.setDelayMix(v); } });
  const reverbMix = slider({ label: 'Reverb mix', min: 0, max: 1, step: 0.01, value: 0.08, unit: '%',
    onInput: (v) => { markCustom(); engine.setReverbMix(v); } });
  const reverbDecay = slider({ label: 'Reverb decay', min: 0.2, max: 6, step: 0.1, value: 1.5, unit: 's',
    onInput: (v) => { engine.setReverbDecay(v); } });
  const dryWet = slider({ label: 'Dry/Wet', min: 0, max: 1, step: 0.01, value: 1, unit: '%',
    onInput: (v) => { markCustom(); engine.setDryWet(v); } });
  [presence, delayTime, delayFb, delayMix, reverbMix, reverbDecay, dryWet].forEach(c => ctrlSpace.appendChild(c));

  let suppressCustom = false;
  function markCustom() {
    if (suppressCustom) return;
    if (presetSelect.value !== 'custom') {
      const o = document.createElement('option');
      o.value = 'custom'; o.textContent = 'Custom';
      presetSelect.appendChild(o); presetSelect.value = 'custom';
    }
  }
  function syncControlsFromPreset(p) {
    suppressCustom = true;
    inputGain.setValue(p.inputGain); hpf.setValue(p.hpf);
    p.eq.forEach((g, i) => eqControls[i].setValue(g));
    gateEnabled.setValue(p.gate.enabled); gateThresh.setValue(p.gate.threshold); gateRange.setValue(p.gate.range);
    compEnabled.setValue(p.comp.enabled); compThresh.setValue(p.comp.threshold); compRatio.setValue(p.comp.ratio);
    deessEnabled.setValue(p.deess.enabled); deessFreq.setValue(p.deess.frequency); deessThresh.setValue(p.deess.threshold);
    limiterThresh.setValue(p.limiter.threshold);
    presence.setValue(p.presence.enabled ? p.presence.gain : 0);
    delayTime.setValue(p.delay.time); delayFb.setValue(p.delay.feedback);
    delayMix.setValue(p.delay.enabled ? p.delay.mix : 0);
    reverbMix.setValue(p.reverb.enabled ? p.reverb.mix : 0);
    reverbDecay.setValue(p.reverb.decay); dryWet.setValue(p.dryWet);
    suppressCustom = false;
  }
  masterOut.addEventListener('input', () => engine.setOutputGainDb(parseFloat(masterOut.value)));

  function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
  function clearError() { errorBox.classList.add('hidden'); errorBox.textContent = ''; }
  engine.on('error', showError);

  async function refreshDevices() {
    try {
      const res = await engine.listDevices();
      fillSelect(inputSelect, res.inputs, 'Default microphone');
      fillSelect(outputSelect, res.outputs, 'Default output');
      if (res.inputs.length === 0) showError('No microphones detected. Connect a USB headset and click Refresh.');
    } catch (err) { showError('Unable to enumerate devices: ' + err.message); }
  }
  function fillSelect(sel, devices, defaultLabel) {
    const prev = sel.value; sel.innerHTML = '';
    const def = document.createElement('option'); def.value = ''; def.textContent = defaultLabel;
    sel.appendChild(def);
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i]; const o = document.createElement('option');
      o.value = d.deviceId; o.textContent = d.label; sel.appendChild(o);
    }
    if (prev && devices.some(d => d.deviceId === prev)) sel.value = prev;
  }
  refreshBtn.addEventListener('click', refreshDevices);

  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      await refreshDevices();
      if (engine.started) {
        const tracks = engine.stream ? engine.stream.getAudioTracks() : [];
        const alive = tracks.some(t => t.readyState === 'live');
        if (!alive) { showError('Active microphone disconnected. Click Start to reconnect.'); stop(); }
      }
    });
  }
  outputSelect.addEventListener('change', async () => {
    const ok = await engine.setOutputDevice(outputSelect.value);
    if (!ok) outputNote.textContent = 'Failed to switch output. Check browser support.';
    else outputNote.textContent = 'Output routed via selected device (Chromium only).';
  });

  async function start() {
    clearError();
    try {
      const deviceId = inputSelect.value || undefined;
      await engine.start(deviceId);
      startBtn.disabled = true; stopBtn.disabled = false; bypassBtn.disabled = false;
      statePill.textContent = 'Engine: running'; statePill.classList.add('running');
    } catch (err) {}
  }
  function stop() {
    engine.stop();
    startBtn.disabled = false; stopBtn.disabled = true; bypassBtn.disabled = true;
    bypassBtn.textContent = 'Bypass: off';
    statePill.textContent = 'Engine: idle'; statePill.classList.remove('running');
  }
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  bypassBtn.addEventListener('click', () => {
    const next = !engine.bypassed;
    engine.setBypass(next);
    bypassBtn.textContent = 'Bypass: ' + (next ? 'on' : 'off');
  });
  resetBtn.addEventListener('click', async () => {
    stop(); await engine.close();
    presetSelect.value = 'clean'; engine.preset = 'clean';
    syncControlsFromPreset(PRESETS.clean);
    masterOut.value = 0; clearError(); await refreshDevices();
    statePill.textContent = 'Engine: reset';
  });
  engine.on('state', (s) => {
    statePill.textContent = s.started ? 'Engine: running' : 'Engine: idle';
    statePill.classList.toggle('running', !!s.started);
  });
  engine.on('meterIn', (d) => meterIn.update(d));
  engine.on('meterOut', (d) => meterOut.update(d));
  engine.on('clip', () => {
    clipLight.classList.add('active');
    setTimeout(() => clipLight.classList.remove('active'), 1500);
  });
  syncControlsFromPreset(PRESETS[engine.preset]);
  refreshDevices();
  window.__headsoke = { engine, meterIn, meterOut };
}