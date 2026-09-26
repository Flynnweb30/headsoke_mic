function format(v, unit) {
  if (unit === 'dB') return v.toFixed(1) + ' dB';
  if (unit === 'Hz') return v >= 1000 ? (v / 1000).toFixed(2) + ' kHz' : Math.round(v) + ' Hz';
  if (unit === 's') return v.toFixed(3) + ' s';
  if (unit === 'x') return v.toFixed(2) + 'x';
  if (unit === '%') return Math.round(v * 100) + '%';
  return String(v);
}
export function slider(opts) {
  const wrap = document.createElement('div'); wrap.className = 'ctrl';
  const head = document.createElement('div'); head.className = 'ctrl-head';
  const name = document.createElement('span'); name.textContent = opts.label;
  const val = document.createElement('span'); val.className = 'val';
  val.textContent = format(opts.value, opts.unit || '');
  head.appendChild(name); head.appendChild(val);
  const input = document.createElement('input');
  input.type = 'range'; input.min = opts.min; input.max = opts.max;
  input.step = opts.step; input.value = opts.value;
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    val.textContent = format(v, opts.unit || '');
    opts.onInput(v);
  });
  wrap.appendChild(head); wrap.appendChild(input);
  wrap.setValue = (v) => { input.value = v; val.textContent = format(parseFloat(v), opts.unit || ''); };
  wrap.getValue = () => parseFloat(input.value);
  return wrap;
}
export function toggle(opts) {
  const wrap = document.createElement('label'); wrap.className = 'toggle';
  const input = document.createElement('input'); input.type = 'checkbox';
  input.checked = !!opts.value;
  input.addEventListener('change', () => opts.onChange(input.checked));
  const span = document.createElement('span'); span.textContent = opts.label;
  wrap.appendChild(input); wrap.appendChild(span);
  wrap.setValue = (v) => { input.checked = !!v; };
  wrap.getValue = () => input.checked;
  return wrap;
}