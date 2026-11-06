/* Sacrament RPG solo: the soundtrack. Original 8-bit tunes, played by the browser itself (Web Audio): two square-wave voices, a triangle bass and a noise drum,
   the way old consoles did it. No sound files. One tune for each place, one for a fight, and short ones for the two endings.
   Music is off until the player turns it on (browsers only allow sound after a tap), and the choice is kept in this browser.
   Notes are written "D4:4": the note and its length in sixteenths. "-" is a rest. Every voice of a tune adds up to the same length, and loops. */
(function (root) {
  'use strict';
  var KEY = 'sacrament-solo-music';
  var TUNES = {
    /* the lychgate: lonely, slow, D minor */
    gate: { bpm: 76, voices: {
      lead: 'D5:6 C5:2 A4:8 F4:4 G4:4 A4:8 Bb4:6 A4:2 G4:4 F4:4 E4:8 -:8 D5:6 E5:2 F5:8 E5:4 D5:4 C5:8 Bb4:4 A4:4 G4:4 E4:4 D4:12 -:4',
      arp: arps(['D4 F4 A4 F4', 'F4 A4 C5 A4', 'Bb3 D4 F4 D4', 'A3 C#4 E4 C#4', 'D4 F4 A4 F4', 'C4 E4 G4 E4', 'Bb3 D4 G4 D4', 'A3 D4 F4 D4'], 2),
      bass: 'D3:16 F2:16 Bb2:16 A2:16 D3:16 C3:16 Bb2:8 A2:8 D3:16' } },
    /* the nave: an organ in an empty church */
    nave: { bpm: 62, voices: {
      lead: '-:8 A4:8 F4:8 D4:8 -:8 Bb4:8 A4:8 G4:8 -:8 A4:8 C5:8 A4:8 G4:16 E4:16',
      arp: arps(['D4 F4 A4 D5', 'Bb3 D4 F4 Bb4', 'F3 A3 C4 F4', 'C4 E4 G4 C5', 'D4 F4 A4 D5', 'G3 Bb3 D4 G4', 'A3 C#4 E4 A4', 'A3 C#4 E4 A4'], 1, 4),
      bass: 'D2:16 Bb1:16 F2:16 C2:16 D2:16 G2:16 A1:32' } },
    /* the crypt: a slow creeping drone, and water dripping */
    crypt: { bpm: 56, voices: {
      lead: '-:12 A4:2 Bb4:2 -:16 -:12 G#4:2 A4:2 -:16 -:8 F4:4 E4:4 -:16 Eb4:8 D4:8 -:16',
      bass: 'D2:8 Eb2:8 D2:8 C#2:8 D2:8 Eb2:8 D2:8 C#2:8 D2:8 Eb2:8 D2:8 C#2:8 D2:8 F2:8 E2:8 C#2:8',
      noise: '-:6 x:1 -:25 -:14 x:1 -:17 -:6 x:1 -:25 -:20 x:1 -:11' } },
    /* the bell tower: climbing, with a little hope in it */
    tower: { bpm: 84, voices: {
      lead: 'A4:4 D5:4 E5:4 F5:4 G5:8 F5:4 E5:4 F5:4 E5:4 D5:4 C5:4 D5:16 A4:4 D5:4 E5:4 F5:4 A5:8 G5:4 F5:4 E5:4 D5:4 C#5:4 E5:4 D5:16',
      arp: arps(['D4 F4 A4 F4', 'Bb3 D4 G4 D4', 'C4 F4 A4 F4', 'D4 F4 A4 F4', 'D4 F4 A4 F4', 'F4 A4 C5 A4', 'A3 C#4 E4 C#4', 'D4 F4 A4 F4'], 2),
      bass: 'D3:16 G2:16 F2:16 D3:16 D3:16 F2:16 A2:16 D3:16' } },
    /* a fight: fast, driving */
    fight: { bpm: 150, voices: {
      lead: 'D5:2 D5:2 F5:2 D5:2 G5:2 F5:2 E5:2 C5:2 D5:4 A4:4 C5:4 A4:4 Bb4:2 Bb4:2 D5:2 Bb4:2 C5:2 D5:2 E5:4 F5:4 E5:4 D5:4 C#5:4',
      arp: arps(['D4 A4 D4 A4', 'D4 A4 D4 A4', 'Bb3 F4 Bb3 F4', 'A3 E4 A3 E4'], 2),
      bass: 'D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 Bb1:2 Bb2:2 Bb1:2 Bb2:2 Bb1:2 Bb2:2 Bb1:2 Bb2:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 C#2:2 E2:2',
      noise: rep('k:1 -:1 h:1 -:1 h:1 -:1 h:1 -:1 ', 8) } },
    /* the bell rings */
    won: { bpm: 88, once: false, voices: {
      lead: 'F#5:4 A5:4 D6:8 B5:4 A5:4 F#5:8 G5:4 F#5:4 E5:4 D5:4 D5:16',
      arp: arps(['D4 F#4 A4 F#4', 'G4 B4 D5 B4', 'A4 C#5 E5 C#5', 'D4 F#4 A4 D5'], 2),
      bass: 'D3:16 G2:16 A2:16 D3:16' } },
    /* the hero falls */
    dead: { bpm: 50, once: true, voices: {
      lead: 'A4:8 G4:8 F4:8 E4:8 D4:32',
      bass: 'D2:64' } }
  };
  TUNES.title = TUNES.gate;
  function rep(t, n) { var o = ''; for (var i = 0; i < n; i++) o += t; return o.trim(); }
  /* broken chords in even notes: each chord's four notes, played `times` round in a bar, each `len` sixteenths long */
  function arps(chords, len, times) { len = len || 2; times = times || 16 / (4 * len); return chords.map(function (c) { return rep(c.split(' ').map(function (n) { return n + ':' + len; }).join(' ') + ' ', times); }).join(' '); }

  var NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function freq(n) { var m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n); if (!m) return 0; var midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]]; return 440 * Math.pow(2, (midi - 69) / 12); }
  function parse(t) { return t.trim().split(/\s+/).map(function (x) { var p = x.split(':'); return { n: p[0], len: parseInt(p[1], 10) || 1 }; }); }

  var ctx = null, master = null, waves = {}, noiseBuf = null, timer = null, current = '', playing = null, on = false;
  function readOn() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
  function setup() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.11; master.connect(ctx.destination);
    /* square waves of two widths, as the old sound chips had: 25% for the lead, 12.5% for the thin harmony */
    waves.lead = pulse(0.25); waves.arp = pulse(0.125);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function pulse(duty) {
    var n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }
  function tone(voice, f, at, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain(), vol = voice === 'bass' ? 0.55 : voice === 'arp' ? 0.16 : 0.24;
    if (voice === 'bass') o.type = 'triangle'; else o.setPeriodicWave(waves[voice]);
    o.frequency.value = f;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.008); g.gain.setValueAtTime(vol * 0.8, at + dur * 0.6); g.gain.linearRampToValueAtTime(0, at + dur * 0.95);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + dur);
  }
  function hit(kind, at) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(), len = kind === 'k' ? 0.12 : kind === 'h' ? 0.03 : 0.06;
    s.buffer = noiseBuf; f.type = kind === 'k' ? 'lowpass' : 'highpass'; f.frequency.value = kind === 'k' ? 400 : kind === 'h' ? 7000 : 2500;
    g.gain.setValueAtTime(kind === 'k' ? 0.5 : 0.18, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(at); s.stop(at + len + 0.01);
  }
  /* A small look-ahead scheduler: every 50 ms, queue whatever falls in the next quarter second. */
  function start(name) {
    var tune = TUNES[name]; if (!tune) return;
    var step = 60 / tune.bpm / 4, voices = Object.keys(tune.voices).map(function (v) { return { v: v, notes: parse(tune.voices[v]), i: 0, at: ctx.currentTime + 0.1 }; });
    playing = { name: name, tune: tune, voices: voices, step: step, done: false };
    timer = setInterval(function () {
      var until = ctx.currentTime + 0.25, p = playing; if (!p) return;
      p.voices.forEach(function (vc) {
        while (vc.at < until) {
          if (vc.i >= vc.notes.length) { if (p.tune.once) return; vc.i = 0; }
          var note = vc.notes[vc.i++], dur = note.len * p.step;
          if (note.n !== '-') { if (vc.v === 'noise') hit(note.n, vc.at); else tone(vc.v, freq(note.n), vc.at, dur); }
          vc.at += dur;
        }
      });
    }, 50);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; playing = null; }
  /* Play a tune (the same one keeps going; another one starts on the next beat). Nothing happens while the music is off. */
  function play(name) {
    current = name;
    if (!on || !setup()) return;
    if (playing && playing.name === name) return;
    stop(); start(name);
  }
  function setOn(v) {
    on = !!v; try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* the choice is just not kept */ }
    if (on) { if (!setup()) { on = false; return false; } if (ctx.state === 'suspended') ctx.resume(); stop(); if (current) start(current); }
    else { stop(); if (ctx && ctx.state === 'running') ctx.suspend(); }
    return on;
  }
  /* Browsers start sound only after a tap: the first tap on the page brings back music the player left on last time. */
  function wake() { if (readOn() && !on) setOn(true); }
  /* Sound effects: short and made the same way as the music. They play only while the sound is on.
     Each is a list of notes [voice, note, start in 16ths, length in 16ths] and noise hits [kind, start]. */
  var SFX = {
    hit: { step: 0.035, n: [['lead', 'A4', 0, 2], ['lead', 'E5', 2, 3]], x: [['s', 0]] },
    crit: { step: 0.04, n: [['lead', 'A4', 0, 2], ['lead', 'E5', 2, 2], ['lead', 'A5', 4, 6], ['arp', 'C#6', 4, 6]], x: [['s', 0], ['s', 4]] },
    miss: { step: 0.05, n: [['bass', 'D3', 0, 2], ['bass', 'A2', 2, 4]], x: [['k', 0]] },
    hurt: { step: 0.04, n: [['lead', 'E4', 0, 2], ['lead', 'C4', 2, 2], ['lead', 'G#3', 4, 5], ['bass', 'E2', 0, 8]], x: [['k', 0], ['s', 0]] },
    horror: { step: 0.08, n: [['bass', 'D2', 0, 14], ['arp', 'Eb5', 2, 10], ['arp', 'A4', 4, 10]], x: [] },
    heart: { step: 0.06, n: [['bass', 'D2', 0, 2], ['bass', 'D2', 3, 2]], x: [['k', 0], ['k', 3]] },
    find: { step: 0.05, n: [['lead', 'D5', 0, 2], ['lead', 'F#5', 2, 2], ['lead', 'A5', 4, 2], ['lead', 'D6', 6, 6], ['arp', 'A5', 6, 6]], x: [] },
    win: { step: 0.07, n: [['lead', 'D5', 0, 3], ['lead', 'D5', 3, 1], ['lead', 'F5', 4, 3], ['lead', 'A5', 7, 9], ['bass', 'D3', 0, 8], ['bass', 'A2', 8, 8]], x: [['k', 0], ['k', 8]] }
  };
  function sfx(name) {
    var e = SFX[name]; if (!e || !on || !setup()) return;
    var at = ctx.currentTime + 0.02;
    e.n.forEach(function (n) { tone(n[0], freq(n[1]), at + n[2] * e.step, n[3] * e.step); });
    e.x.forEach(function (x) { hit(x[0], at + x[1] * e.step); });
  }
  root.SacramentSoloMusic = { sfx: sfx, SFX: SFX, play: play, setOn: setOn, isOn: function () { return on; }, wanted: readOn, wake: wake, tunes: Object.keys(TUNES), TUNES: TUNES, parse: parse, freq: freq };
})(typeof window !== 'undefined' ? window : globalThis);
