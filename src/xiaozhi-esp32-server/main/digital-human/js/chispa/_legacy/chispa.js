// Chispa: avatar de ojos expresivos. Reemplaza a Live2DManager con la misma interfaz.
(function () {
const BG = '#0b1020', EYE = '#4ade80', HI = '#eafff1', SP = '#ffc247';
const S = {
  neutral:{w:56,h:72,top:0,tilt:0,cheek:0,gx:0,gy:0,mouth:0,smile:0,spark:0,asym:0,gap:88},
  listening:{w:60,h:84,top:0,tilt:0,cheek:0,gx:0,gy:-2,mouth:0,smile:0,spark:0,asym:0,gap:90},
  thinking:{w:52,h:62,top:0,tilt:0,cheek:0,gx:16,gy:-16,mouth:0,smile:0,spark:1,asym:-0.2,gap:88},
  speaking:{w:56,h:70,top:0,tilt:0,cheek:0,gx:0,gy:0,mouth:1,smile:0,spark:0,asym:0,gap:88},
  happy:{w:60,h:64,top:0,tilt:0,cheek:0.6,gx:0,gy:0,mouth:0,smile:1,spark:0.6,asym:0,gap:90},
  surprised:{w:50,h:98,top:0,tilt:0,cheek:0,gx:0,gy:-2,mouth:0,smile:0,spark:0,asym:0,gap:92},
  sad:{w:54,h:66,top:0.15,tilt:-0.6,cheek:0,gx:0,gy:6,mouth:0,smile:-1,spark:0,asym:0,gap:86},
  sleepy:{w:58,h:66,top:0.55,tilt:0,cheek:0,gx:0,gy:8,mouth:0,smile:0,spark:0,asym:0,gap:88}
};
const EMO = {happy:'happy',laughing:'happy',funny:'happy',loving:'happy',winking:'happy',cool:'happy',delicious:'happy',relaxed:'happy',
  sad:'sad',crying:'sad',angry:'sad',embarrassed:'sad',confused:'sad',surprised:'surprised',shocked:'surprised',thinking:'thinking',sleepy:'sleepy',neutral:'neutral'};

class ChispaManager {
  constructor() {
    this.live2dModel = null; this.isTalking = false; this.analyser = null; this.dataArray = null;
    this.state = 'neutral'; this.base = 'neutral'; this.P = Object.assign({}, S.neutral);
    this.jx = 0; this.jy = 0; this.blink = 0; this.blinkAt = 1.5; this.nextJit = 1; this.t0 = performance.now();
    this.emoTimer = null;
  }
  async initializeLive2D() {
    this.cv = document.getElementById('live2d-stage');
    this.c = this.cv.getContext('2d');
    const fit = () => { const d = window.devicePixelRatio || 1; this.cv.width = this.cv.clientWidth * d; this.cv.height = this.cv.clientHeight * d; this.d = d; };
    fit(); window.addEventListener('resize', fit);
    this.live2dModel = true;
    requestAnimationFrame(n => this.frame(n));
    const ml = document.getElementById('modelLoading'); if (ml) ml.style.display = 'none';
    return true;
  }
  setState(n) { if (S[n]) this.state = n; }
  setBase(n) { this.base = n; if (!this.isTalking && !this.emoTimer) this.state = n; }
  startTalking() {
    if (this.isTalking) return;
    this.isTalking = true; this.state = 'speaking';
    const ap = window.chatApp && window.chatApp.audioPlayer;
    try { const an = ap && ap.streamingContext && ap.streamingContext.getAnalyser(); if (an) { this.analyser = an; this.dataArray = new Uint8Array(an.frequencyBinCount); } } catch (e) {}
  }
  stopTalking() { this.isTalking = false; if (!this.emoTimer) this.state = this.base; }
  triggerEmotionAction(emotion) {
    const st = EMO[emotion]; if (!st) return;
    clearTimeout(this.emoTimer);
    if (!this.isTalking || st === 'happy' || st === 'surprised' || st === 'sad') {
      this.state = st;
      this.emoTimer = setTimeout(() => { this.emoTimer = null; this.state = this.isTalking ? 'speaking' : this.base; }, 3500);
    }
  }
  initializeAudioAnalyzer() { return false; }
  async switchModel() { return true; }
  motion() {}
  destroy() { this.live2dModel = null; }
  level() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let s = 0; for (let i = 0; i < this.dataArray.length; i++) s += this.dataArray[i];
      return Math.min(1, (s / this.dataArray.length) / 90);
    }
    const t = performance.now() / 1000; return Math.abs(Math.sin(t * 9) * Math.cos(t * 3.3));
  }
  eye(c, cx, cy, w, h, top, tilt, cheek, side) {
    const x = cx - w / 2, y = cy - h / 2, r = Math.min(w, h) * 0.38;
    c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
    c.fillStyle = EYE; c.fillRect(x, y, w, h);
    c.fillStyle = HI; c.beginPath(); c.arc(x + w * 0.28, y + h * 0.24, Math.max(4, w * 0.1), 0, 7); c.fill();
    c.fillStyle = BG;
    const tl = Math.max(0, -tilt) * 0.45, inner = h * top, outer = h * (top + tl);
    const lo = side < 0 ? outer : inner, ro = side < 0 ? inner : outer;
    if (lo > 0 || ro > 0) { c.beginPath(); c.moveTo(x - 2, y - 2); c.lineTo(x + w + 2, y - 2); c.lineTo(x + w + 2, y + ro); c.lineTo(x - 2, y + lo); c.closePath(); c.fill(); }
    if (cheek > 0.02) { const rr = w * 0.75; c.beginPath(); c.arc(cx, cy + h / 2 + rr * (1.05 - cheek * 0.9), rr, 0, 7); c.fill(); }
    c.restore();
  }
  star(c, x, y, s, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = SP; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.28 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.restore(); }
  frame(now) {
    if (!this.live2dModel) return;
    const c = this.c, P = this.P, t = (now - this.t0) / 1000, cur = this.state, T = S[cur];
    for (const k in T) { const g = (k === 'gx' ? T.gx + this.jx : k === 'gy' ? T.gy + this.jy : T[k]); P[k] += (g - P[k]) * 0.16; }
    if (t > this.nextJit) { this.nextJit = t + 1.6 + Math.random() * 2; const m = cur === 'thinking' ? 2 : 8; this.jx = (Math.random() - 0.5) * m; this.jy = (Math.random() - 0.5) * m * 0.6; }
    if (t > this.blinkAt && this.blink === 0) { this.blink = 0.001; this.blinkAt = t + 2.5 + Math.random() * 3; }
    if (this.blink > 0) { this.blink += 0.09; if (this.blink >= 2) this.blink = 0; }
    const bl = this.blink > 0 ? (this.blink < 1 ? this.blink : 2 - this.blink) : 0, top = Math.max(P.top, bl);
    const W = this.cv.width, H = this.cv.height, sc = Math.min(W, H) * 0.8 / 240;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(sc, 0, 0, sc, (W - 240 * sc) / 2, (H - 240 * sc) / 2);
    c.fillStyle = BG; c.beginPath(); c.roundRect(0, 0, 240, 240, 24); c.fill();
    c.save(); c.beginPath(); c.roundRect(0, 0, 240, 240, 24); c.clip();
    const cy = 100 + P.gy, cxL = 120 - P.gap / 2 + P.gx, cxR = 120 + P.gap / 2 + P.gx;
    this.eye(c, cxL, cy, P.w, P.h, top, P.tilt, P.cheek, -1);
    this.eye(c, cxR, cy, P.w, P.h * (1 + P.asym), top, P.tilt, P.cheek, 1);
    if (P.spark > 0.03) { const pu = cur === 'thinking' ? 1 + 0.18 * Math.sin(t * 6) : 1; this.star(c, 120, 32, 13 * P.spark * pu, t * (cur === 'thinking' ? 1.5 : 0.3)); }
    if (P.mouth > 0.05) { const m = P.mouth * (0.2 + 0.8 * this.level()), h = 5 + m * 24; c.fillStyle = EYE; c.beginPath(); c.roundRect(102, 190 - h / 2, 36, h, h / 2); c.fill(); }
    else if (Math.abs(P.smile) > 0.05) { c.strokeStyle = EYE; c.lineWidth = 5; c.lineCap = 'round'; c.globalAlpha = Math.min(1, Math.abs(P.smile)); c.beginPath();
      if (P.smile > 0) c.arc(120, 172, 24, Math.PI * 0.2, Math.PI * 0.8); else c.arc(120, 214, 24, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); c.globalAlpha = 1; }
    c.restore();
    requestAnimationFrame(n => this.frame(n));
  }
}
window.ChispaManager = ChispaManager;
})();
