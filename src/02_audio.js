// ───────────────────────── procedural audio ─────────────────────────
const Audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null, ambGain: null,
  muted: false, vol: 0.8, started: false,
  windNode: null, windGain: null, wavesGain: null, delay: null,
  music: { root: 57, scale: [0, 2, 4, 7, 9], nextNote: 0, nextChord: 0, chordIdx: 0, intensity: 0, padOsc: [], padGain: null, combat: 0, beat: 0 },

  init() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.started = true;
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination); this.comp = comp;
    this.musicGain = c.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
    this.ambGain = c.createGain(); this.ambGain.gain.value = 0.5; this.ambGain.connect(this.master);
    // echo for music
    this.delay = c.createDelay(1.0); this.delay.delayTime.value = 0.42;
    const fb = c.createGain(); fb.gain.value = 0.38;
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); dl.connect(this.musicGain);
    // noise buffer
    const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // wind
    const wn = c.createBufferSource(); wn.buffer = buf; wn.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
    this.windGain = c.createGain(); this.windGain.gain.value = 0.0;
    wn.connect(wf); wf.connect(this.windGain); this.windGain.connect(this.ambGain); wn.start();
    this.windFilter = wf;
    // waves
    const wv = c.createBufferSource(); wv.buffer = buf; wv.loop = true; wv.playbackRate.value = 0.5;
    const wvf = c.createBiquadFilter(); wvf.type = 'lowpass'; wvf.frequency.value = 600;
    this.wavesGain = c.createGain(); this.wavesGain.gain.value = 0;
    wv.connect(wvf); wvf.connect(this.wavesGain); this.wavesGain.connect(this.ambGain); wv.start();
    // pad
    this.music.padGain = c.createGain(); this.music.padGain.gain.value = 0.0;
    const pf = c.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 900;
    this.music.padGain.connect(pf); pf.connect(this.musicGain);
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator(); o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.value = 220; o.detune.value = (i - 1) * 7;
      o.connect(this.music.padGain); o.start(); this.music.padOsc.push(o);
    }
    this.music.padGain.gain.setTargetAtTime(0.16, c.currentTime, 2);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, 0.05); },
  setVolume(v) { this.vol = v; if (this.master && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  // tone helper
  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, delay = 0, dest = null, filter = 0, echo = false } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); n = f; }
    n.connect(g); g.connect(dest || this.sfxGain);
    if (echo && this.delay) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.3, freq = 1000, q = 1, type = 'bandpass', delay = 0, slide = 0, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 1;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },

  sfx(name, opt = {}) {
    if (!this.ctx || this.muted) return;
    const r = Math.random;
    switch (name) {
      case 'step': this.noise(0.06, { vol: 0.05 * (opt.v || 1), freq: 700 + r() * 500, q: 1.5 }); break;
      case 'splashstep': this.noise(0.12, { vol: 0.08, freq: 1800, q: 0.8 }); break;
      case 'wing': this.noise(0.28, { vol: 0.12 * (opt.v || 1), freq: 260, q: 0.7, type: 'lowpass', slide: 0.5, attack: 0.08 }); break;
      case 'whoosh': this.noise(0.18, { vol: 0.16, freq: 1200, q: 0.9, slide: 0.4, attack: 0.02 }); break;
      case 'heavyswing': this.noise(0.35, { vol: 0.2, freq: 500, q: 0.9, slide: 0.4, attack: 0.08 }); break;
      case 'hit': this.tone(160, 0.12, { type: 'square', vol: 0.12, slide: 0.5, filter: 1200 }); this.noise(0.08, { vol: 0.2, freq: 2500, q: 0.8 }); break;
      case 'hurt': this.tone(300, 0.25, { type: 'sawtooth', vol: 0.09, slide: 0.5, filter: 1500 }); break;
      case 'dodge': this.noise(0.2, { vol: 0.12, freq: 900, slide: 1.8 }); break;
      case 'coin': this.tone(1318, 0.09, { type: 'square', vol: 0.06, filter: 4000 }); this.tone(1760, 0.18, { type: 'square', vol: 0.06, delay: 0.07, filter: 4000 }); break;
      case 'pickup': [0, 4, 7, 12].forEach((n, i) => this.tone(this.mtof(76 + n), 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.06, echo: true })); break;
      case 'golden': [0, 4, 7, 11, 14, 19].forEach((n, i) => this.tone(this.mtof(72 + n), 0.5, { type: 'sine', vol: 0.14, delay: i * 0.08, echo: true })); break;
      case 'quest': [0, 7, 12, 16].forEach((n, i) => this.tone(this.mtof(67 + n), 0.6, { type: 'triangle', vol: 0.13, delay: i * 0.12, echo: true })); break;
      case 'stage': [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(this.mtof(60 + n), 1.2, { type: 'sine', vol: 0.12, delay: i * 0.14, echo: true })); break;
      case 'ring': this.tone(this.mtof(84 + (opt.n || 0)), 0.35, { type: 'sine', vol: 0.15, echo: true }); this.tone(this.mtof(91 + (opt.n || 0)), 0.3, { type: 'sine', vol: 0.08, delay: 0.05 }); break;
      case 'ui': this.tone(880, 0.06, { type: 'triangle', vol: 0.06 }); break;
      case 'talk': this.tone(500 + r() * 300, 0.05, { type: 'triangle', vol: 0.04 }); break;
      case 'splash': this.noise(0.5, { vol: 0.25, freq: 1400, q: 0.5, slide: 0.3, attack: 0.01 }); break;
      case 'cannon': this.tone(70, 0.6, { type: 'sine', vol: 0.4, slide: 0.4 }); this.noise(0.6, { vol: 0.35, freq: 400, q: 0.4, type: 'lowpass', slide: 0.3 }); break;
      case 'boom': this.tone(55, 0.8, { type: 'sine', vol: 0.4, slide: 0.5 }); this.noise(0.7, { vol: 0.3, freq: 300, type: 'lowpass', slide: 0.3 }); break;
      case 'fuse': this.noise(0.6, { vol: 0.05, freq: 5000, q: 2 }); break;
      case 'warn': this.tone(520, 0.12, { type: 'square', vol: 0.05, filter: 2000 }); this.tone(390, 0.14, { type: 'square', vol: 0.05, delay: 0.13, filter: 2000 }); break;
      case 'fire': this.noise(0.9, { vol: 0.22, freq: 700, q: 0.5, type: 'lowpass', attack: 0.05 }); break;
      case 'gust': this.noise(0.8, { vol: 0.25, freq: 600, q: 0.6, slide: 2.5, attack: 0.1 }); break;
      case 'bubble': for (let i = 0; i < 6; i++) this.tone(600 + r() * 900, 0.08, { type: 'sine', vol: 0.07, slide: 1.8, delay: i * 0.07 }); break;
      case 'pop': this.tone(900, 0.06, { type: 'sine', vol: 0.1, slide: 2 }); break;
      case 'puff': this.noise(0.4, { vol: 0.18, freq: 800, q: 0.5, slide: 0.5 }); this.tone(400, 0.2, { type: 'triangle', vol: 0.06, slide: 1.5 }); break;
      case 'chest': this.tone(220, 0.15, { type: 'square', vol: 0.06, filter: 900 }); [0, 4, 7, 12, 16].forEach((n, i) => this.tone(this.mtof(72 + n), 0.4, { type: 'triangle', vol: 0.11, delay: 0.15 + i * 0.07, echo: true })); break;
      case 'discover': [0, 5, 9, 12].forEach((n, i) => this.tone(this.mtof(69 + n), 0.8, { type: 'sine', vol: 0.1, delay: i * 0.18, echo: true })); break;
      case 'roar': this.tone(110, 1.2, { type: 'sawtooth', vol: 0.12, slide: 0.6, filter: 700 }); this.noise(1.1, { vol: 0.2, freq: 300, q: 0.6, type: 'lowpass' }); break;
      case 'bell': [0, 0.6, 1.2].forEach((d) => { this.tone(660, 1.4, { type: 'sine', vol: 0.12, delay: d, echo: true }); this.tone(1320 * 1.01, 0.8, { type: 'sine', vol: 0.05, delay: d }); }); break;
      case 'fail': this.tone(300, 0.2, { type: 'triangle', vol: 0.08, slide: 0.7 }); this.tone(220, 0.3, { type: 'triangle', vol: 0.08, delay: 0.18, slide: 0.7 }); break;
      case 'heart': this.tone(this.mtof(81), 0.15, { type: 'sine', vol: 0.08 }); this.tone(this.mtof(88), 0.25, { type: 'sine', vol: 0.07, delay: 0.1, echo: true }); break;
      case 'clam': this.tone(this.mtof(opt.n || 72), 1.0, { type: 'sine', vol: 0.16, echo: true }); this.tone(this.mtof((opt.n || 72) + 12), 0.6, { type: 'sine', vol: 0.05 }); break;
      case 'creature': this.creatureVoice(opt.type || 'ember', opt.mood || 'happy', opt.stage || 0); break;
    }
  },
  creatureVoice(type, mood, stage) {
    const base = [1.6, 1.25, 1.0, 0.85][stage] || 1;
    const happy = mood === 'happy' || mood === 'celebrate';
    if (type === 'ember') {
      // trilling chirp-growl
      const f = 520 * base;
      for (let i = 0; i < (happy ? 4 : 2); i++) this.tone(f * (1 + i * 0.08), 0.09, { type: 'sawtooth', vol: 0.06, slide: happy ? 1.4 : 0.7, delay: i * 0.07, filter: 2400 });
      if (stage >= 2) this.tone(f * 0.3, 0.4, { type: 'sawtooth', vol: 0.05, slide: 0.8, filter: 600 });
    } else if (type === 'cloud') {
      // bright squawk
      const f = 900 * base;
      this.tone(f, 0.16, { type: 'square', vol: 0.05, slide: happy ? 1.3 : 0.6, filter: 3000 });
      this.tone(f * 1.25, 0.12, { type: 'square', vol: 0.04, slide: 0.8, delay: 0.14, filter: 3000 });
      this.noise(0.12, { vol: 0.04, freq: 2500, q: 2, delay: 0.02 });
    } else {
      // bubbly coo
      const f = 440 * base;
      this.tone(f, 0.35, { type: 'sine', vol: 0.11, slide: happy ? 1.5 : 0.75, attack: 0.04, echo: true });
      this.tone(f * 1.5, 0.25, { type: 'sine', vol: 0.06, slide: happy ? 1.3 : 0.8, delay: 0.15, attack: 0.03 });
    }
  },

  // music: generative pentatonic, region-based
  regionMusic: {
    village: { root: 60, scale: [0, 2, 4, 7, 9], chords: [0, 5, 9, 7], tempo: 0.55 },
    frost: { root: 62, scale: [0, 2, 3, 7, 10], chords: [0, 3, 10, 7], tempo: 0.7 },
    nest: { root: 55, scale: [0, 1, 4, 7, 8], chords: [0, 8, 1, 7], tempo: 0.6 },
    beach: { root: 64, scale: [0, 2, 4, 7, 9], chords: [0, 9, 5, 7], tempo: 0.42 },
    lagoon: { root: 61, scale: [0, 2, 4, 6, 9], chords: [0, 4, 9, 6], tempo: 0.75 },
    ship: { root: 57, scale: [0, 2, 3, 5, 7, 10], chords: [0, 10, 8, 7], tempo: 0.35 },
    sea: { root: 59, scale: [0, 2, 4, 7, 9], chords: [0, 7, 9, 5], tempo: 0.8 },
  },
  update(dt, ctx) {
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime, m = this.music;
    const rm = this.regionMusic[ctx.region] || this.regionMusic.village;
    // ambience
    this.windGain.gain.setTargetAtTime(clamp(ctx.wind, 0, 1) * 0.35, now, 0.3);
    this.windFilter.frequency.setTargetAtTime(300 + ctx.wind * 900, now, 0.3);
    this.wavesGain.gain.setTargetAtTime(clamp(ctx.waves, 0, 1) * 0.12, now, 0.5);
    m.combat = damp(m.combat, ctx.combat ? 1 : 0, 1.5, dt);
    if (now > m.nextChord) {
      m.chordIdx = (m.chordIdx + 1) % rm.chords.length;
      const ch = rm.root - 24 + rm.chords[m.chordIdx];
      const fr = [this.mtof(ch), this.mtof(ch + 7), this.mtof(ch + 12 + (rm.scale[2] || 4))];
      m.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(fr[i], now, 0.8));
      m.nextChord = now + 6;
    }
    if (now > m.nextNote) {
      const tempo = rm.tempo * (1 - m.combat * 0.45);
      const sc = rm.scale; const deg = sc[(Math.random() * sc.length) | 0];
      const oct = Math.random() < 0.3 ? 12 : 0;
      const note = rm.root + deg + oct + (m.combat > 0.5 ? -12 : 0);
      if (Math.random() < (ctx.calm ? 0.55 : 0.8)) this.tone(this.mtof(note), 1.4, { type: 'triangle', vol: 0.09, attack: 0.01, dest: this.musicGain, echo: true, filter: 2600 });
      if (Math.random() < 0.18) this.tone(this.mtof(note + 7), 1.2, { type: 'sine', vol: 0.05, delay: tempo * 0.5, dest: this.musicGain, echo: true });
      if (m.combat > 0.5) {
        m.beat++;
        this.noise(0.12, { vol: 0.12 * m.combat, freq: 120, type: 'lowpass', q: 0.5 });
        if (m.beat % 2) this.noise(0.05, { vol: 0.05, freq: 6000, q: 1 });
      }
      m.nextNote = now + tempo * (Math.random() < 0.25 ? 2 : 1);
    }
  },
};
