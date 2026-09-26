import { Meter } from './meters.js';
import { slider, toggle } from './controls.js';
import { PRESETS, PRESET_KEYS } from '../audio/presets.js';
import { detectCapabilities, capabilityReport } from '../support/capabilities.js';
import { createState } from './state.js';

export function buildApp(root, engine) {
  // ---- Capabilities + state, computed before any DOM ----
  const caps = detectCapabilities();
  const state = createState();
  state.set({ preset: engine.preset });

  // ---- Static HTML shell (always renders, never depends on mic) ----
  root.innerHTML = [
    '<div class="workspace">',

    '<header class="topbar">',
    '  <div class="brand">',
    '    <div class="brand-mark">H</div>',
    '    <div class="brand-text">',
    '      <div class="brand-name">Headsoke</div>',
    '      <div class="brand-sub">Browser Singing Mic Processor</div>',
    '    </div>',
    '  </div>',
    '  <div class="topbar-actions">',
    '    <span id="engine-state" class="pill pill-idle">Ready</span>',
    '    <button id="settings-btn" class="btn btn-ghost" aria-expanded="false">Status</button>',
    '    <button id="reset-btn" class="btn btn-ghost">Reset</button>',
    '  </div>',
    '</header>',

    '<section id="settings-panel" class="settings-panel hidden" aria-label="Browser capability report">',
    '  <div class="settings-grid" id="settings-grid"></div>',
    '</section>',

    '<section class="boundary" role="note" aria-label="Browser limitation notice">',
    '  <div class="boundary-icon" aria-hidden="true">i</div>',
    '  <div class="boundary-body">',
    '    <strong>Browser limitation:</strong> this web app processes and plays your microphone audio through the browser. A normal web page <em>cannot</em> register its processed output as a system microphone device. Routing into Discord, Zoom, Teams, OBS, or games requires a virtual audio driver such as VB-CABLE or BlackHole.',
    '  </div>',
    '</section>',

    '<section class="steps" aria-label="Setup workflow">',
    '  <ol class="step-list">',
    '    <li class="step" data-step="1"><span class="step-num">1</span><span class="step-text">Select microphone</span></li>',
    '    <li class="step" data-step="2"><span class="step-num">2</span><span class="step-text">Select output</span></li>',
    '    <li class="step" data-step="3"><span class="step-num">3</span><span class="step-text">Allow microphone</span></li>',
    '    <li class="step" data-step="4"><span class="step-num">4</span><span class="step-text">Start audio</span></li>',
    '    <li class="step" data-step="5"><span class="step-num">5</span><span class="step-text">Choose preset</span></li>',
    '    <li class="step" data-step="6"><span class="step-num">6</span><span class="step-text">Fine-tune</span></li>',
    '    <li class="step" data-step="7"><span class="step-num">7</span><span class="step-text">Monitor levels</span></li>',
    '  </ol>',
    '</section>',

    '<div class="grid">',

    '<aside class="panel panel-strip">',
    '  <div class="panel-title">Signal Flow</div>',
    '  <div class="strip">',
    '    <div class="strip-row" data-stage="input"><div class="strip-dot"></div><div class="strip-label">Mic Input</div><div class="strip-meta" id="strip-input-meta">idle</div></div>',
    '    <div class="strip-row" data-stage="gate"><div class="strip-dot"></div><div class="strip-label">Noise Gate</div><div class="strip-meta" id="strip-gate-meta">off</div></div>',
    '    <div class="strip-row" data-stage="eq"><div class="strip-dot"></div><div class="strip-label">EQ + Filters</div><div class="strip-meta" id="strip-eq-meta">flat</div></div>',
    '    <div class="strip-row" data-stage="deesser"><div class="strip-dot"></div><div class="strip-label">De-esser</div><div class="strip-meta" id="strip-deess-meta">off</div></div>',
    '    <div class="strip-row" data-stage="comp"><div class="strip-dot"></div><div class="strip-label">Compressor</div><div class="strip-meta" id="strip-comp-meta">off</div></div>',
    '    <div class="strip-row" data-stage="presence"><div class="strip-dot"></div><div class="strip-label">Presence</div><div class="strip-meta" id="strip-presence-meta">off</div></div>',
    '    <div class="strip-row" data-stage="space"><div class="strip-dot"></div><div class="strip-label">Delay + Reverb</div><div class="strip-meta" id="strip-space-meta">dry</div></div>',
    '    <div class="strip-row" data-stage="limiter"><div class="strip-dot"></div><div class="strip-label">Limiter</div><div class="strip-meta" id="strip-limiter-meta">-1.0 dB</div></div>',
    '    <div class="strip-row" data-stage="output"><div class="strip-dot"></div><div class="strip-label">Browser Output</div><div class="strip-meta" id="strip-output-meta">idle</div></div>',
    '  </div>',
    '  <div class="panel-title">Meters</div>',
    '  <div class="meter-grid">',
    '    <div class="meter-block"><div class="meter-cap">In</div><canvas id="meter-in" class="meter-canvas"></canvas></div>',
    '    <div class="meter-block"><div class="meter-cap">Out</div><canvas id="meter-out" class="meter-canvas"></canvas></div>',
    '  </div>',
    '  <div class="clip-row"><span id="clip-indicator" class="clip-light">CLIP</span><span class="clip-hint">output over 0 dBFS</span></div>',
    '</aside>',

    '<main class="panel panel-deck">',
    '  <div class="deck-row deck-row-primary">',
    '    <div class="field"><label class="field-label" for="input-select">Input microphone</label><select id="input-select"></select></div>',
    '    <div class="field"><label class="field-label" for="output-select">Output device</label><select id="output-select"></select><div id="output-note" class="field-note"></div></div>',
    '    <div class="field"><label class="field-label" for="preset-select">Preset</label><select id="preset-select"></select></div>',
    '  </div>',
    '  <div class="deck-row deck-row-actions">',
    '    <button id="refresh-devices" class="btn btn-ghost">Refresh devices</button>',
    '    <button id="start-btn" class="btn btn-primary">Start audio</button>',
    '    <button id="stop-btn" class="btn btn-danger" disabled>Stop</button>',
    '    <button id="bypass-btn" class="btn" disabled>Bypass: off</button>',
    '  </div>',
    '  <div id="error-box" class="error hidden" role="alert"></div>',
    '  <div class="clusters">',
    '    <section class="cluster"><div class="cluster-head"><span class="cluster-kicker">01</span><span class="cluster-title">Input Stage</span></div><div class="cluster-body" id="input-controls"></div></section>',
    '    <section class="cluster"><div class="cluster-head"><span class="cluster-kicker">02</span><span class="cluster-title">Tone &amp; Filters</span></div><div class="cluster-body" id="eq-controls"></div></section>',
    '    <section class="cluster"><div class="cluster-head"><span class="cluster-kicker">03</span><span class="cluster-title">Dynamics</span></div><div class="cluster-body" id="dyn-controls"></div></section>',
    '    <section class="cluster"><div class="cluster-head"><span class="cluster-kicker">04</span><span class="cluster-title">Space &amp; Mix</span></div><div class="cluster-body" id="space-controls"></div></section>',
    '  </div>',
    '</main>',

    '<aside class="panel panel-inspector">',
    '  <div class="panel-title">Master</div>',
    '  <div class="master-block">',
    '    <label class="field-label" for="master-out">Output level (dB)</label>',
    '    <input id="master-out" type="range" min="-24" max="12" step="0.5" value="0" />',
    '    <div class="master-read"><span id="master-read">0.0 dB</span></div>',
    '  </div>',
    '  <div class="panel-title">Status</div>',
    '  <dl class="stat-list">',
    '    <div><dt>Mic capture</dt><dd id="stat-mic">Not running</dd></div>',
    '    <div><dt>Permission</dt><dd id="stat-perm">unknown</dd></div>',
    '    <div><dt>Context</dt><dd id="stat-context">closed</dd></div>',
    '    <div><dt>Sample rate</dt><dd id="stat-rate">-</dd></div>',
    '    <div><dt>AudioWorklet</dt><dd id="stat-worklet">checking</dd></div>',
    '    <div><dt>setSinkId</dt><dd id="stat-sink">checking</dd></div>',
    '    <div><dt>Secure context</dt><dd id="stat-secure">checking</dd></div>',
    '  </dl>',
    '  <div class="panel-title">Notes</div>',
    '  <p class="inspector-note">Wear headphones when monitoring. Speakers + live mic cause feedback.</p>',
    '  <p class="inspector-note">Every slider writes to a Web Audio node parameter. Nothing here is simulated.</p>',
    '</aside>',

    '</div>',
    '</div>'
  ].join('\n');

  // ---- DOM refs (all null-safe) ----
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
  const masterRead   = $('master-read');
  const statePill    = $('engine-state');
  const clipLight    = $('clip-indicator');
  const settingsBtn  = $('settings-btn');
  const settingsPanel= $('settings-panel');
  const settingsGrid = $('settings-grid');

  const statMic     = $('stat-mic');
  const statPerm    = $('stat-perm');
  const statContext = $('stat-context');
  const statRate    = $('stat-rate');
  const statWorklet = $('stat-worklet');
  const statSink    = $('stat-sink');
  const statSecure  = $('stat-secure');

  // ---- Meters ----
  const meterIn  = new Meter($('meter-in'),  { color: '#63e6be' });
  const meterOut = new Meter($('meter-out'), { color: '#4cc9f0' });

  // ---- Capability report ----
  statWorklet.textContent = caps.audioWorklet ? 'supported' : 'not supported';
  statSink.textContent    = caps.setSinkId    ? 'supported' : 'not supported';
  statSecure.textContent  = caps.isSecure     ? 'yes'       : 'no - mic blocked';

  const capRows = capabilityReport(caps);
  settingsGrid.innerHTML = capRows.map(([name, ok, note]) =>
    '<div class="cap-row"><div class="cap-name">' + name +
    '</div><div class="cap-val ' + (ok ? 'ok' : 'bad') + '">' +
    (ok ? 'Supported' : 'Not supported') +
    '</div><div class="cap-note">' + note + '</div></div>'
  ).join('');

  settingsBtn.addEventListener('click', () => {
    const hidden = settingsPanel.classList.toggle('hidden');
    settingsBtn.setAttribute('aria-expanded', String(!hidden));
  });

  // ---- Immediate capability warnings ----
  if (!caps.isSecure) showError('Microphone requires HTTPS or http://localhost. Serve the app over a secure origin.');
  if (!caps.audioWorklet) showError('AudioWorklet is not supported in this browser. Core DSP will not run.');
  if (!caps.mediaDevices) showError('getUserMedia is not available. Microphone capture will not work.');
  if (!caps.setSinkId) {
    outputNote.textContent = 'Output selection not supported in this browser. Using system default.';
    outputSelect.disabled = true;
    outputSelect.title = 'HTMLMediaElement.setSinkId() unavailable.';
  } else {
    outputNote.textContent = 'Uses HTMLMediaElement.setSinkId() (Chromium-based).';
  }

  // ---- Presets ----
  PRESET_KEYS.forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = PRESETS[key].label;
    presetSelect.appendChild(opt);
  });
  presetSelect.value = engine.preset;

  // ---- Control clusters ----
  const ctrlInput = $('input-controls');
  const ctrlEq    = $('eq-controls');
  const ctrlDyn   = $('dyn-controls');
  const ctrlSpace = $('space-controls');

  const inputGain = slider({ label: 'Input gain', min: -12, max: 24, step: 0.5, value: 6, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setInputGainDb(v); updateStrip(); } });
  const hpf = slider({ label: 'High-pass', min: 20, max: 400, step: 5, value: 90, unit: 'Hz',
    onInput: (v) => { markCustom(); engine.setHpf(v); updateStrip(); } });
  ctrlInput.appendChild(inputGain);
  ctrlInput.appendChild(hpf);

  const eqLabels = ['Low shelf', 'Low-mid', 'Mid', 'High-mid', 'High shelf'];
  const eqControls = eqLabels.map((lab, i) => slider({
    label: lab, min: -12, max: 12, step: 0.5, value: 0, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setEqGain(i, v); updateStrip(); }
  }));
  eqControls.forEach(c => ctrlEq.appendChild(c));

  const gateEnabled = toggle({ label: 'Noise gate enabled', value: true,
    onChange: (v) => { markCustom(); engine.setGate('enabled', v ? 1 : 0); updateStrip(); } });
  const gateThresh = slider({ label: 'Gate threshold', min: -80, max: -10, step: 1, value: -48, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setGate('threshold', v); } });
  const gateRange = slider({ label: 'Gate depth', min: 0, max: 80, step: 1, value: 40, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setGate('range', v); } });
  const compEnabled = toggle({ label: 'Compressor enabled', value: true,
    onChange: (v) => { markCustom(); engine.setComp('ratio', v ? 3 : 1); updateStrip(); } });
  const compThresh = slider({ label: 'Comp threshold', min: -60, max: 0, step: 1, value: -20, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setComp('threshold', v); } });
  const compRatio = slider({ label: 'Comp ratio', min: 1, max: 20, step: 0.5, value: 3, unit: 'x',
    onInput: (v) => { markCustom(); engine.setComp('ratio', v); updateStrip(); } });
  const deessEnabled = toggle({ label: 'De-esser enabled', value: true,
    onChange: (v) => { markCustom(); engine.setDeess('enabled', v ? 1 : 0); updateStrip(); } });
  const deessFreq = slider({ label: 'De-esser freq', min: 3000, max: 10000, step: 100, value: 6500, unit: 'Hz',
    onInput: (v) => { markCustom(); engine.setDeess('frequency', v); } });
  const deessThresh = slider({ label: 'De-esser threshold', min: -60, max: 0, step: 1, value: -28, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setDeess('threshold', v); } });
  const limiterThresh = slider({ label: 'Limiter threshold', min: -12, max: 0, step: 0.5, value: -1, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setLimiterThreshold(v); updateStrip(); } });
  [gateEnabled, gateThresh, gateRange, compEnabled, compThresh, compRatio,
   deessEnabled, deessFreq, deessThresh, limiterThresh].forEach(c => ctrlDyn.appendChild(c));

  const presence = slider({ label: 'Presence', min: 0, max: 12, step: 0.5, value: 2.5, unit: 'dB',
    onInput: (v) => { markCustom(); engine.setPresence(v); updateStrip(); } });
  const delayTime = slider({ label: 'Delay time', min: 0.02, max: 1.0, step: 0.01, value: 0.25, unit: 's',
    onInput: (v) => { markCustom(); engine.setDelayTime(v); } });
  const delayFb = slider({ label: 'Delay feedback', min: 0, max: 0.85, step: 0.01, value: 0.25, unit: '%',
    onInput: (v) => { markCustom(); engine.setDelayFb(v); } });
  const delayMix = slider({ label: 'Delay mix', min: 0, max: 1, step: 0.01, value: 0.0, unit: '%',
    onInput: (v) => { markCustom(); engine.setDelayMix(v); updateStrip(); } });
  const reverbMix = slider({ label: 'Reverb mix', min: 0, max: 1, step: 0.01, value: 0.08, unit: '%',
    onInput: (v) => { markCustom(); engine.setReverbMix(v); updateStrip(); } });
  const reverbDecay = slider({ label: 'Reverb decay', min: 0.2, max: 6, step: 0.1, value: 1.5, unit: 's',
    onInput: (v) => { engine.setReverbDecay(v); } });
  const dryWet = slider({ label: 'Dry / Wet', min: 0, max: 1, step: 0.01, value: 1, unit: '%',
    onInput: (v) => { markCustom(); engine.setDryWet(v); } });
  [presence, delayTime, delayFb, delayMix, reverbMix, reverbDecay, dryWet].forEach(c => ctrlSpace.appendChild(c));

  // ---- Custom preset tracking ----
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

  presetSelect.addEventListener('change', () => {
    const key = presetSelect.value;
    if (key === 'custom') return;
    engine.applyPreset(key);
    syncControlsFromPreset(PRESETS[key]);
    state.set({ preset: key });
    updateStrip();
  });

  masterOut.addEventListener('input', () => {
    const db = parseFloat(masterOut.value);
    masterRead.textContent = db.toFixed(1) + ' dB';
    engine.setOutputGainDb(db);
  });

  // ---- Error UI ----
  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    state.set({ lastError: msg });
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      // eslint-disable-next-line no-console
      console.warn('[Headsoke]', msg);
    }
  }
  function clearError() {
    if (!errorBox) return;
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
    state.set({ lastError: '' });
  }
  engine.on('error', showError);

  // ---- Workflow step highlighting ----
  const stepEls = Array.from(root.querySelectorAll('.step'));
  function setStep(n, done, active) {
    stepEls.forEach((el) => {
      const idx = parseInt(el.getAttribute('data-step'), 10);
      el.classList.toggle('done', idx < n || (idx === n && done));
      el.classList.toggle('active', idx === n && active);
    });
  }

  // ---- Device management ----
  async function refreshDevices() {
    try {
      const res = await engine.listDevices();
      fillSelect(inputSelect, res.inputs, 'Default microphone');
      fillSelect(outputSelect, res.outputs, 'Default output');
      state.set({ inputDevices: res.inputs, outputDevices: res.outputs });
      if (res.inputs.length === 0) {
        showError('No microphones detected. Connect a USB headset and click Refresh.');
      }
    } catch (err) {
      showError('Unable to enumerate devices: ' + err.message);
    }
  }
  function fillSelect(sel, devices, defaultLabel) {
    const prev = sel.value;
    sel.innerHTML = '';
    const def = document.createElement('option');
    def.value = ''; def.textContent = defaultLabel;
    sel.appendChild(def);
    devices.forEach((d) => {
      const o = document.createElement('option');
      o.value = d.deviceId; o.textContent = d.label;
      sel.appendChild(o);
    });
    if (prev && devices.some(d => d.deviceId === prev)) sel.value = prev;
  }
  refreshBtn.addEventListener('click', refreshDevices);

  if (caps.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      await refreshDevices();
      if (engine.started) {
        const tracks = engine.stream ? engine.stream.getAudioTracks() : [];
        const alive = tracks.some(t => t.readyState === 'live');
        if (!alive) {
          showError('Active microphone disconnected. Click Start audio to reconnect.');
          stop();
        }
      }
    });
  }

  outputSelect.addEventListener('change', async () => {
    const ok = await engine.setOutputDevice(outputSelect.value);
    if (!ok) outputNote.textContent = 'Failed to switch output. Check browser support.';
    else { outputNote.textContent = 'Output routed via selected device.'; state.set({ selectedOutput: outputSelect.value }); }
  });

  inputSelect.addEventListener('change', () => {
    state.set({ selectedInput: inputSelect.value });
    setStep(1, !!inputSelect.value, false);
    setStep(3, false, true);
  });

  // ---- Start / stop ----
  async function start() {
    clearError();
    state.set({ engineStatus: 'requesting-permission' });
    statePill.textContent = 'Waiting for permission';
    statePill.className = 'pill pill-idle';
    setStep(3, false, true);
    try {
      const deviceId = inputSelect.value || undefined;
      await engine.start(deviceId);
      state.set({ engineStatus: 'running', micPermission: 'granted' });
      statPerm.textContent = 'granted';
      statContext.textContent = engine.ctx ? engine.ctx.state : 'closed';
      statRate.textContent = engine.ctx ? engine.ctx.sampleRate + ' Hz' : '-';
      startBtn.disabled = true; stopBtn.disabled = false; bypassBtn.disabled = false;
      statePill.textContent = 'Processing'; statePill.className = 'pill pill-live';
      setStep(3, true, false);
      setStep(4, true, false);
      setStep(5, false, true);
      updateStrip();
    } catch (err) {
      state.set({ engineStatus: 'error', micPermission: err && err.name === 'NotAllowedError' ? 'denied' : 'unknown' });
      statePill.textContent = 'Error'; statePill.className = 'pill pill-danger';
      statPerm.textContent = state.get().micPermission;
      statMic.textContent = 'Not running';
      updateStrip();
    }
  }
  function stop() {
    engine.stop();
    startBtn.disabled = false; stopBtn.disabled = true; bypassBtn.disabled = true;
    bypassBtn.textContent = 'Bypass: off';
    statePill.textContent = 'Stopped'; statePill.className = 'pill pill-idle';
    statMic.textContent = 'Not running';
    state.set({ engineStatus: 'idle' });
    updateStrip();
  }
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);

  bypassBtn.addEventListener('click', () => {
    const next = !engine.bypassed;
    engine.setBypass(next);
    bypassBtn.textContent = 'Bypass: ' + (next ? 'on' : 'off');
    bypassBtn.classList.toggle('btn-active', next);
    state.set({ bypassed: next });
    updateStrip();
  });

  resetBtn.addEventListener('click', async () => {
    stop();
    await engine.close();
    presetSelect.value = 'clean'; engine.preset = 'clean';
    syncControlsFromPreset(PRESETS.clean);
    masterOut.value = 0; masterRead.textContent = '0.0 dB';
    clearError(); await refreshDevices();
    statContext.textContent = 'closed';
    statRate.textContent = '-';
    statePill.textContent = 'Ready'; statePill.className = 'pill pill-idle';
    state.set({ preset: 'clean', engineStatus: 'idle', bypassed: false });
    setStep(1, false, true);
    updateStrip();
  });

  engine.on('state', (s) => {
    statePill.textContent = s.started ? (s.bypassed ? 'Bypassed' : 'Processing') : 'Ready';
    statePill.className = 'pill ' + (s.started ? 'pill-live' : 'pill-idle');
    statMic.textContent = s.started ? 'Active' : 'Not running';
    if (s.started && engine.ctx) {
      statContext.textContent = engine.ctx.state;
      statRate.textContent = engine.ctx.sampleRate + ' Hz';
    }
    state.set({ engineStatus: s.started ? 'running' : 'idle', bypassed: !!s.bypassed });
  });

  engine.on('meterIn', (d) => meterIn.update(d));
  engine.on('meterOut', (d) => meterOut.update(d));
  engine.on('clip', () => {
    clipLight.classList.add('active');
    setTimeout(() => clipLight.classList.remove('active'), 1500);
  });

  // ---- Signal flow state ----
  const stripRows = {};
  ['input','gate','eq','deesser','comp','presence','space','limiter','output'].forEach((s) => {
    stripRows[s] = root.querySelector('.strip-row[data-stage="' + s + '"]');
  });
  const stripMeta = {
    input: $('strip-input-meta'), gate: $('strip-gate-meta'), eq: $('strip-eq-meta'),
    deesser: $('strip-deess-meta'), comp: $('strip-comp-meta'), presence: $('strip-presence-meta'),
    space: $('strip-space-meta'), limiter: $('strip-limiter-meta'), output: $('strip-output-meta')
  };
  function setRow(stage, live, meta) {
    const row = stripRows[stage];
    if (!row) return;
    row.classList.toggle('live', !!live);
    if (meta !== undefined && stripMeta[stage]) stripMeta[stage].textContent = meta;
  }
  function updateStrip() {
    const started = engine.started;
    const byp = engine.bypassed;
    setRow('input', started, started ? 'streaming' : 'idle');
    setRow('gate', started && !byp && gateEnabled.getValue(), gateEnabled.getValue() ? 'active' : 'off');
    const eqSum = eqControls.reduce((a, c) => a + Math.abs(c.getValue()), 0);
    setRow('eq', started && !byp && eqSum > 0.01, eqSum > 0.01 ? 'shaping' : 'flat');
    setRow('deesser', started && !byp && deessEnabled.getValue(), deessEnabled.getValue() ? 'active' : 'off');
    setRow('comp', started && !byp && compEnabled.getValue(), compEnabled.getValue() ? 'active' : 'off');
    setRow('presence', started && !byp && presence.getValue() > 0.01, presence.getValue() > 0.01 ? 'boost' : 'off');
    const spaceOn = (delayMix.getValue() > 0.001) || (reverbMix.getValue() > 0.001);
    setRow('space', started && !byp && spaceOn, spaceOn ? 'wet' : 'dry');
    setRow('limiter', started && !byp, limiterThresh.getValue().toFixed(1) + ' dB');
    setRow('output', started, byp ? 'bypass' : 'playing');
  }

  // ---- Bootstrap ----
  syncControlsFromPreset(PRESETS[engine.preset]);
  setStep(1, false, true);
  updateStrip();
  refreshDevices();

  // Expose for debugging in dev only
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    window.__headsoke = { engine, state, meterIn, meterOut, caps };
  }
}