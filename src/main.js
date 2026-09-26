import './style.css';
import { AudioEngine } from './audio/engine.js';
import { buildApp } from './ui/layout.js';

const root = document.getElementById('app');
const engine = new AudioEngine();
buildApp(root, engine);

window.addEventListener('beforeunload', () => { engine.close(); });