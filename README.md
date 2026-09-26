# Headsoke

Real-time singing microphone processor - runs entirely in the browser using the Web Audio API and AudioWorklet.

## Features

- Real USB headset microphone capture via `getUserMedia()`
- Live DSP: input/output gain, HPF, 5-band EQ, noise gate, compressor, de-esser, presence, delay, reverb, limiter, dry/wet
- Real-time input/output level meters + clip detection
- 6 presets (Flat, Clean, Singing, Studio, Warm, Clear)
- Bypass, reset, device hot-swap handling
- AudioWorklet-based DSP for low latency

## Browser limitations

- **Virtual microphone is not possible from a web page.** To route into Zoom/OBS/Discord, install a virtual audio cable (VB-CABLE on Windows, BlackHole on macOS) and route the OS output to it.
- **Output device selection (`setSinkId`)** works in Chromium only (Chrome, Edge, Opera).
- **Microphone requires HTTPS** (or `http://localhost`). Render provides HTTPS automatically.

## Local development

    npm install
    npm run dev

## Build

    npm run build
    npm run preview

## Deploy on Render

1. Push this repo to GitHub.
2. On Render: New + -> Static Site -> connect the repo.
3. Build Command: `npm ci && npm run build`
4. Publish Directory: `dist`
5. (Optional) Use Blueprint with the included `render.yaml`.

## License

MIT