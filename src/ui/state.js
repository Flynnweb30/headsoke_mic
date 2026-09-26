export const STATE_DEFAULTS = {
  preset: 'clean',
  engineStatus: 'idle',     // idle | requesting-permission | starting | running | error
  micPermission: 'unknown', // unknown | granted | denied | prompt
  inputDevices: [],
  outputDevices: [],
  selectedInput: '',
  selectedOutput: '',
  lastError: '',
  bypassed: false
};

export function createState(initial = {}) {
  const listeners = new Set();
  const state = { ...STATE_DEFAULTS, ...initial };
  function emit() { for (const cb of listeners) cb({ ...state }); }
  return {
    get() { return { ...state }; },
    set(patch) {
      let changed = false;
      for (const k in patch) {
        if (state[k] !== patch[k]) { state[k] = patch[k]; changed = true; }
      }
      if (changed) emit();
    },
    subscribe(cb) { listeners.add(cb); cb({ ...state }); return () => listeners.delete(cb); }
  };
}