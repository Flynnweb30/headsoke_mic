# Headsoke

Real-time singing microphone processor that runs entirely in the browser using the Web Audio API and AudioWorklet.

## Quick start

    npm install
    npm run dev
    # open http://127.0.0.1:5173

## Production build

    npm run build
    npm run preview
    npm run validate

## Workflow

1. Select microphone
2. Select output (Chromium only)
3. Click **Start audio** and allow the permission prompt
4. Choose a preset (Clean, Singing, Studio, Warm, Clear)
5. Fine-tune with sliders in the four DSP clusters
6. Watch input / output meters and the CLIP badge
7. Listen on headphones

## Real functionality

Every control writes to a real Web Audio node parameter:
input gain, high-pass, 5-band EQ, AudioWorklet noise gate, AudioWorklet de-esser, DynamicsCompressorNode, presence peaking filter, DelayNode, ConvolverNode reverb, DynamicsCompressorNode limiter, dry/wet mixers, and gain stage routing.

Presets overwrite the full DSP parameter map. Bypass genuinely reroutes the signal. Reset closes the audio context and returns everything to defaults.

## Browser limitations (honest)

- **No virtual microphone.** A normal web page cannot register itself as a system input for Discord, Zoom, Teams, OBS, or games. Use VB-CABLE (Windows) or BlackHole (macOS) and route the OS output to it.
- **`setSinkId` (output selection)** works in Chromium only. Firefox and Safari disable the dropdown with a clear note.
- **HTTPS or localhost required** for `getUserMedia` and `AudioWorklet`.
- **Mobile Safari** suspends mic capture when the screen locks.
- **Background tabs** on mobile may suspend the audio context.

## Deploy on Render

Static Site:

- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Rewrite: `/*` -> `/index.html` (Rewrite)
- Headers: `/*` `Cross-Origin-Opener-Policy: same-origin`
- Headers: `/*` `Cross-Origin-Embedder-Policy: require-corp`

Or use the included `render.yaml` as a Blueprint.

## License

MIT