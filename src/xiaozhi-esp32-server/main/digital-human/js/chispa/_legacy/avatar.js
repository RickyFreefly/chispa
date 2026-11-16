// ChispaAvatar: robot SVG animable. Subcomponentes: ChispaFace, ChispaEyes, ChispaMouth, ChispaBody,
// ChispaVoiceVisualizer. Mantiene la misma interfaz que usaba la app con Live2DManager.
import { ChispaPersonaConfig } from './persona.js';
import { ChispaStateMachine, ChispaEmotionController } from './state.js';

const NS = 'http://www.w3.org/2000/svg';
const SVG_MARKUP = `
<svg class="chispa-svg" viewBox="0 0 400 470" role="img" aria-label="Chispa, asistente virtual">
<defs>
  <filter id="chGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="chHeadG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7E2FA"/></linearGradient>
  <linearGradient id="chBodyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E2DCF7"/></linearGradient>
  <clipPath id="chEyeClip"><rect x="-24" y="-28" width="48" height="56" rx="22"/></clipPath>
  <symbol id="chBolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 10-13h-7z"/></symbol>
</defs>
<ellipse id="chShadow" cx="200" cy="456" rx="84" ry="9" fill="#000" opacity=".35"/>
<g id="chFloat">
  <ellipse id="chJet" cx="200" cy="424" rx="30" ry="7" fill="#22C55E" opacity=".4" filter="url(#chGlow)"/>
  <g id="chBody">
    <rect x="150" y="300" width="100" height="108" rx="42" fill="url(#chBodyG)" stroke="#DDD6FE" stroke-width="3"/>
    <rect x="170" y="322" width="60" height="60" rx="24" fill="#0D1222"/>
    <use id="chChestBolt" href="#chBolt" x="176" y="328" width="48" height="48" fill="#22C55E" filter="url(#chGlow)"/>
    <rect x="176" y="392" width="48" height="8" rx="4" fill="#7C3AED" opacity=".85"/>
  </g>
  <g id="chArmL"><rect x="143" y="326" width="22" height="56" rx="11" fill="url(#chBodyG)" stroke="#DDD6FE" stroke-width="3"/><circle cx="154" cy="384" r="11" fill="#7C3AED"/></g>
  <g id="chArmR"><rect x="235" y="326" width="22" height="56" rx="11" fill="url(#chBodyG)" stroke="#DDD6FE" stroke-width="3"/><circle cx="246" cy="384" r="11" fill="#7C3AED"/></g>
  <g id="chHead">
    <path d="M 68 210 C 66 70, 334 70, 332 210" fill="none" stroke="#7C3AED" stroke-width="11" stroke-linecap="round"/>
    <rect x="52" y="168" width="38" height="74" rx="18" fill="#7C3AED"/><rect x="310" y="168" width="38" height="74" rx="18" fill="#7C3AED"/>
    <use href="#chBolt" x="58" y="187" width="26" height="36" fill="#86EFAC"/><use href="#chBolt" x="316" y="187" width="26" height="36" fill="#86EFAC"/>
    <rect x="82" y="104" width="236" height="192" rx="80" fill="url(#chHeadG)" stroke="#DDD6FE" stroke-width="3"/>
    <rect id="chScreen" x="104" y="132" width="192" height="140" rx="56" fill="#0D1222" stroke="#7C3AED" stroke-opacity=".55" stroke-width="2.5"/>
    <path d="M 126 150 Q 160 138 196 140" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="5" stroke-linecap="round"/>
    <g id="chFace">
      <ellipse id="chBlushL" cx="124" cy="236" rx="14" ry="8" fill="#FCE7F3" opacity="0"/>
      <ellipse id="chBlushR" cx="276" cy="236" rx="14" ry="8" fill="#FCE7F3" opacity="0"/>
      <g id="chEyeL"><g clip-path="url(#chEyeClip)" filter="url(#chGlow)">
        <rect x="-24" y="-28" width="48" height="56" fill="#22C55E"/>
        <circle class="pupil" r="12" fill="#064E3B"/>
        <circle cx="-9" cy="-14" r="5" fill="#F0FFF4"/><circle cx="9" cy="10" r="2.4" fill="#F0FFF4" opacity=".8"/>
        <rect class="lid" x="-26" y="-30" width="52" height="0" fill="#0D1222"/>
        <circle class="cover" cx="0" cy="70" r="36" fill="#0D1222"/>
      </g></g>
      <g id="chEyeR"><g clip-path="url(#chEyeClip)" filter="url(#chGlow)">
        <rect x="-24" y="-28" width="48" height="56" fill="#22C55E"/>
        <circle class="pupil" r="12" fill="#064E3B"/>
        <circle cx="-9" cy="-14" r="5" fill="#F0FFF4"/><circle cx="9" cy="10" r="2.4" fill="#F0FFF4" opacity=".8"/>
        <rect class="lid" x="-26" y="-30" width="52" height="0" fill="#0D1222"/>
        <circle class="cover" cx="0" cy="70" r="36" fill="#0D1222"/>
      </g></g>
      <g id="chBrowL"><rect x="-17" y="-3" width="34" height="6" rx="3" fill="#86EFAC"/></g>
      <g id="chBrowR"><rect x="-17" y="-3" width="34" height="6" rx="3" fill="#86EFAC"/></g>
      <path id="chMouth" d="" fill="#FCE7F3" fill-opacity="0" stroke="#22C55E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#chGlow)"/>
    </g>
  </g>
  <g id="chDots" opacity="0"><circle cx="304" cy="96" r="5" fill="#7C3AED"/><circle cx="326" cy="76" r="7" fill="#7C3AED"/><circle cx="352" cy="52" r="10" fill="#7C3AED"/></g>
  <text id="chQuestion" x="318" y="96" font-size="46" font-weight="700" fill="#7C3AED" opacity="0" transform="rotate(12 318 96)" font-family="system-ui,sans-serif">?</text>
  <g id="chZzz" opacity="0" fill="#A78BFA" font-family="system-ui,sans-serif" font-weight="700"><text id="chZ1" x="304" y="100" font-size="22">z</text><text id="chZ2" x="326" y="76" font-size="30">z</text></g>
</g>
</svg>`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RATES = { mouthOpen: 24, eyeScale: 11, lidTop: 12, cheek: 9, browYL: 11, browYR: 11, browRL: 9, browRR: 9, armL: 7, armR: 7, tilt: 5, lean: 5, glow: 4, bolt: 6, dots: 8, zzz: 4, question: 8, blush: 6, smile: 9, mouthW: 10, gazeX: 14, gazeY: 14, floatAmp: 3 };

// ---------- ChispaVoiceVisualizer: nivel de voz real (Web Audio) o, si no hay, simulado y marcado ----------
export class ChispaVoiceVisualizer {
  constructor() { this.analyser = null; this.data = null; this.value = 0; this.simulated = false; }
  attach() {
    try {
      const ap = window.chatApp && window.chatApp.audioPlayer;
      const an = ap && ap.streamingContext && ap.streamingContext.getAnalyser();
      if (an) { this.analyser = an; this.data = new Uint8Array(an.frequencyBinCount); }
    } catch (e) { /* sin analizador */ }
    return !!this.analyser;
  }
  sample(t, speaking) {
    let raw = 0;
    if (!speaking) { this.simulated = false; }
    else if (this.analyser) {
      this.simulated = false;
      this.analyser.getByteFrequencyData(this.data);
      let s = 0, n = 0; for (let i = 2; i < Math.min(48, this.data.length); i++) { s += this.data[i]; n++; }
      raw = clamp((s / Math.max(1, n)) / 95, 0, 1);
    } else {
      this.simulated = true;                       // modo degradado, no corresponde a fonemas reales
      raw = Math.abs(Math.sin(t * 9) * Math.cos(t * 3.3)) * 0.8;
    }
    const k = raw > this.value ? 0.55 : 0.18;      // ataque rápido, caída suave
    this.value += (raw - this.value) * k;
    return this.value;
  }
}

// ---------- Subcomponentes de render ----------
class ChispaEyes {
  constructor(root) {
    this.L = root.querySelector('#chEyeL'); this.R = root.querySelector('#chEyeR');
    this.browL = root.querySelector('#chBrowL'); this.browR = root.querySelector('#chBrowR');
    this.pL = this.L.querySelector('.pupil'); this.pR = this.R.querySelector('.pupil');
    this.lidL = this.L.querySelector('.lid'); this.lidR = this.R.querySelector('.lid');
    this.covL = this.L.querySelector('.cover'); this.covR = this.R.querySelector('.cover');
  }
  render(p, blinkL, blinkR, gzL, gzR) {
    const s = p.eyeScale;
    const place = (g, cx, gz) => g.setAttribute('transform', `translate(${(cx + gz.x * 2.6).toFixed(2)} ${(196 + gz.y * 2).toFixed(2)}) scale(${s.toFixed(3)})`);
    place(this.L, 158, gzL); place(this.R, 242, gzR);
    this.pL.setAttribute('cx', (gzL.x * 9).toFixed(2)); this.pL.setAttribute('cy', (gzL.y * 9).toFixed(2));
    this.pR.setAttribute('cx', (gzR.x * 9).toFixed(2)); this.pR.setAttribute('cy', (gzR.y * 9).toFixed(2));
    const lid = (b) => clamp(Math.max(p.lidTop, b), 0, 1) * 62;
    this.lidL.setAttribute('height', lid(blinkL).toFixed(2)); this.lidR.setAttribute('height', lid(blinkR).toFixed(2));
    const cov = (28 + 36 - p.cheek * 46).toFixed(2);
    this.covL.setAttribute('cy', cov); this.covR.setAttribute('cy', cov);
    const lift = (s - 1) * 16;
    this.browL.setAttribute('transform', `translate(158 ${(152 + p.browYL - lift).toFixed(2)}) rotate(${(-p.browRL * 18).toFixed(2)})`);
    this.browR.setAttribute('transform', `translate(242 ${(152 + p.browYR - lift).toFixed(2)}) rotate(${(p.browRR * 18).toFixed(2)})`);
  }
}
class ChispaMouth {
  constructor(root) { this.el = root.querySelector('#chMouth'); }
  render(p) {
    const hw = 22 * p.mouthW, cy = -p.smile * 6, ctrl = cy + p.smile * 18;
    const o = clamp(p.mouthOpen, 0, 1);
    const d = `M ${-hw} ${cy} Q 0 ${(ctrl - o * 2).toFixed(2)} ${hw} ${cy} Q 0 ${(ctrl + o * 44).toFixed(2)} ${-hw} ${cy} Z`;
    this.el.setAttribute('d', d);
    this.el.setAttribute('transform', 'translate(200 242)');
    this.el.setAttribute('fill-opacity', clamp(o * 2.5, 0, 1).toFixed(2));
  }
}
class ChispaFace {
  constructor(root) {
    this.eyes = new ChispaEyes(root); this.mouth = new ChispaMouth(root);
    this.bl = root.querySelector('#chBlushL'); this.br = root.querySelector('#chBlushR');
    this.face = root.querySelector('#chFace'); this.screen = root.querySelector('#chScreen');
  }
  render(p, b) {
    this.eyes.render(p, b.l, b.r, b.gzL, b.gzR); this.mouth.render(p);
    this.bl.setAttribute('opacity', (p.blush * 0.95).toFixed(2)); this.br.setAttribute('opacity', (p.blush * 0.95).toFixed(2));
    this.face.setAttribute('opacity', clamp(p.glow, 0.15, 1).toFixed(2));
    this.screen.setAttribute('stroke-opacity', (0.25 + 0.4 * clamp(p.glow, 0, 1)).toFixed(2));
  }
}
class ChispaBody {
  constructor(root) {
    this.float = root.querySelector('#chFloat'); this.shadow = root.querySelector('#chShadow'); this.jet = root.querySelector('#chJet');
    this.body = root.querySelector('#chBody'); this.head = root.querySelector('#chHead');
    this.armL = root.querySelector('#chArmL'); this.armR = root.querySelector('#chArmR');
    this.bolt = root.querySelector('#chChestBolt');
    this.dots = root.querySelector('#chDots'); this.q = root.querySelector('#chQuestion'); this.zzz = root.querySelector('#chZzz');
    this.z1 = root.querySelector('#chZ1'); this.z2 = root.querySelector('#chZ2');
  }
  render(p, o, t) {
    this.float.setAttribute('transform', `translate(0 ${o.floatY.toFixed(2)})`);
    const sh = 1 - o.floatY * 0.012; this.shadow.setAttribute('rx', (84 * sh).toFixed(1)); this.shadow.setAttribute('opacity', (0.35 * sh).toFixed(2));
    this.jet.setAttribute('opacity', (0.15 + 0.3 * p.floatAmp * clamp(p.glow, 0, 1)).toFixed(2));
    this.body.setAttribute('transform', `translate(200 350) scale(1 ${o.breath.toFixed(4)}) translate(-200 -350)`);
    this.head.setAttribute('transform', `translate(${o.sway.toFixed(2)} ${(p.lean * 3).toFixed(2)}) rotate(${(p.tilt + o.tiltExtra).toFixed(2)} 200 295) translate(200 200) scale(${(1 + p.lean * 0.025).toFixed(4)}) translate(-200 -200)`);
    this.armL.setAttribute('transform', `rotate(${(p.armL + o.armLx).toFixed(2)} 154 330)`);
    this.armR.setAttribute('transform', `rotate(${(-(p.armR + o.armRx)).toFixed(2)} 246 330)`);
    this.bolt.setAttribute('opacity', clamp(0.3 + p.bolt * 0.7 * (0.85 + 0.15 * Math.sin(t * 3)), 0.1, 1).toFixed(2));
    let dotsOp = p.dots; this.dots.setAttribute('opacity', clamp(dotsOp, 0, 1).toFixed(2));
    [...this.dots.children].forEach((c, i) => c.setAttribute('opacity', (0.3 + 0.7 * Math.max(0, Math.sin(t * 4 - i * 0.9))).toFixed(2)));
    this.q.setAttribute('opacity', clamp(p.question, 0, 1).toFixed(2));
    this.zzz.setAttribute('opacity', clamp(p.zzz, 0, 1).toFixed(2));
    this.z1.setAttribute('y', (100 - ((t * 10) % 14)).toFixed(1)); this.z2.setAttribute('y', (76 - ((t * 7) % 12)).toFixed(1));
  }
}

// ---------- ChispaAvatar ----------
export class ChispaAvatar {
  constructor() {
    this.persona = new ChispaPersonaConfig();
    this.machine = new ChispaStateMachine();
    this.emotions = new ChispaEmotionController();
    this.voice = new ChispaVoiceVisualizer();
    this.live2dModel = null;      // compatibilidad con el código existente
    this.isTalking = false;
    this.cur = null; this.target = null;
    this.reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    this.nextBlink = 1.2; this.blinkT = -1; this.doubleBlink = false; this.blinkOffset = 0.03;
    this.nextSaccade = 0.8; this.saccade = { x: 0, y: 0 };
    this.gz = { x: 0, y: 0 }; this.t0 = performance.now(); this.last = this.t0;
    this.machine.addEventListener('change', () => { this._pose(); });
    this.persona.addEventListener('change', () => { this._pose(); });
  }
  async initializeLive2D() {          // nombre heredado: monta el avatar
    this.host = document.getElementById('chispa-stage');
    if (!this.host) throw new Error('No existe #chispa-stage');
    this.host.innerHTML = SVG_MARKUP;
    const root = this.host.querySelector('svg');
    this.face = new ChispaFace(root); this.bodyR = new ChispaBody(root);
    this._pose(true);
    this.live2dModel = true;
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.last = performance.now(); });
    requestAnimationFrame((n) => this._frame(n));
    return true;
  }
  // ---- API de eventos reales ----
  setFact(k, v) { this.machine.setFact(k, v); }
  pulse(m, ms) { this.machine.pulse(m, ms); }
  startTalking() { if (this.isTalking) return; this.isTalking = true; this.voice.attach(); this.machine.setFact('processing', false); this.machine.setFact('speaking', true); }
  stopTalking() { this.isTalking = false; this.machine.setFact('speaking', false); this.machine.setFact('processing', false); }
  triggerEmotionAction(emotion) {
    const m = { happy: 'happy', laughing: 'happy', funny: 'happy', loving: 'happy', winking: 'happy', cool: 'happy', delicious: 'happy', relaxed: 'happy',
      surprised: 'surprised', shocked: 'surprised', confused: 'error' }[emotion];
    if (m) this.machine.pulse(m, 2800);
  }
  initializeAudioAnalyzer() { return this.voice.attach(); }
  async switchModel() { return true; }
  motion() {}
  destroy() { this.live2dModel = null; }

  _pose(snap) {
    this.target = this.emotions.poseFor(this.machine.state, this.persona.profile);
    if (!this.cur) this.cur = Object.assign({}, this.target);
    if (snap) this.cur = Object.assign({}, this.target);
  }
  _frame(now) {
    if (!this.live2dModel) return;
    requestAnimationFrame((n) => this._frame(n));
    const dt = clamp((now - this.last) / 1000, 0, 0.05); this.last = now;
    if (dt === 0) return;
    const t = (now - this.t0) / 1000, ms = this.reduced.matches ? 0.25 : 1;
    const st = this.machine.state, prof = this.persona.profile;
    const speaking = st.activity === 'speaking';
    const level = this.voice.sample(t, speaking);

    // objetivos procedurales según estado
    const T = Object.assign({}, this.target);
    if (speaking) {
      T.mouthOpen = Math.max(T.mouthOpen, level * 1.05);
      if (prof.gestures && !st.mood) { const a = 0.4 + level * 0.6; T.armR = 20 + Math.sin(t * 2.1) * 14 * a * ms; T.armL = 6 + Math.sin(t * 1.7 + 1) * 6 * a * ms; }
    }
    if (st.mood === 'teaching') T.armR += Math.sin(t * 3.1) * 9 * ms;
    if (st.mood === 'happy') { T.armL += Math.sin(t * 9) * 10 * ms; T.armR += Math.sin(t * 9 + 1) * 10 * ms; }
    if (st.mood === 'encouraging') T.armL += Math.sin(t * 5) * 7 * ms;

    // mirada: sacádicas independientes por estado
    if (t > this.nextSaccade) {
      const calm = st.activity === 'listening' ? 0.12 : st.activity === 'thinking' ? 0.2 : st.activity === 'offline' ? 0 : 0.55;
      this.saccade = { x: (Math.random() * 2 - 1) * calm, y: (Math.random() * 2 - 1) * calm * 0.6 };
      this.nextSaccade = t + (st.activity === 'speaking' ? 1.5 : 1.1) + Math.random() * 2.4;
    }
    const gTX = clamp(T.gazeX + this.saccade.x, -1, 1), gTY = clamp(T.gazeY + this.saccade.y, -1, 1);

    // suavizado por parámetro
    for (const k in this.cur) {
      const goal = (k === 'gazeX') ? gTX : (k === 'gazeY') ? gTY : T[k];
      const r = RATES[k] || 6;
      this.cur[k] += (goal - this.cur[k]) * (1 - Math.exp(-r * dt));
    }
    const p = this.cur;

    // parpadeo natural (intervalos aleatorios, a veces doble, párpados con desfase)
    if (this.blinkT < 0 && t > this.nextBlink && st.activity !== 'offline') { this.blinkT = 0; }
    let bL = 0, bR = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const ph = (x) => { const u = x / 0.17; return u < 0 ? 0 : u > 1 ? 0 : Math.sin(u * Math.PI); };
      bL = ph(this.blinkT); bR = ph(this.blinkT - this.blinkOffset);
      if (this.blinkT > 0.17 + this.blinkOffset) {
        if (!this.doubleBlink && Math.random() < 0.15) { this.doubleBlink = true; this.blinkT = 0; }
        else { this.doubleBlink = false; this.blinkT = -1; this.nextBlink = t + 1.8 + Math.random() * 4.2; this.blinkOffset = Math.random() * 0.05; }
      }
    }
    const gzL = { x: this.gz.x = p.gazeX, y: p.gazeY }, gzR = { x: p.gazeX * 0.92, y: p.gazeY * 0.95 };

    const fa = p.floatAmp * ms;
    const o = {
      floatY: Math.sin(t * 1.6) * 6 * fa + Math.sin(t * 0.7) * 2 * fa,
      breath: 1 + Math.sin(t * 2.2) * 0.012 * (st.activity === 'offline' ? 0.4 : 1) * (0.5 + ms * 0.5),
      sway: Math.sin(t * 0.8) * 2.2 * ms,
      tiltExtra: Math.sin(t * 0.9) * 1.2 * ms + (speaking ? level * 2.2 * Math.sin(t * 5) * ms : 0),
      armLx: 0, armRx: 0
    };
    this.face.render(p, { l: bL, r: bR, gzL, gzR });
    this.bodyR.render(p, o, t);
  }
}
