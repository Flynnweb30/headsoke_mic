export function detectCapabilities() {
  const hasAC = typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function';
  const ACProto = hasAC ? (window.AudioContext || window.webkitAudioContext).prototype : null;
  const md = navigator.mediaDevices;
  return {
    audioContext: hasAC,
    audioWorklet: !!(ACProto && 'audioWorklet' in ACProto),
    mediaDevices: !!(md && typeof md.getUserMedia === 'function'),
    enumerateDevices: !!(md && typeof md.enumerateDevices === 'function'),
    setSinkId: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
    isSecure: window.isSecureContext,
    userAgent: navigator.userAgent
  };
}

export function capabilityReport(caps) {
  const lines = [];
  lines.push(['AudioContext', caps.audioContext, 'Required for all DSP.']);
  lines.push(['AudioWorklet', caps.audioWorklet, 'Required for gate / de-esser / meters.']);
  lines.push(['getUserMedia', caps.mediaDevices, 'Required to capture the microphone.']);
  lines.push(['enumerateDevices', caps.enumerateDevices, 'Required to list devices.']);
  lines.push(['setSinkId', caps.setSinkId, 'Chromium-only. Enables output-device selection.']);
  lines.push(['Secure context', caps.isSecure, 'Required for microphone. Use HTTPS or localhost.']);
  return lines;
}