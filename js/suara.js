/* ==========================================================================
   SIMRS Mini — suara.js : panggilan antrean bersuara di browser
   - Nada "ding-dong" 3 nada (Web Audio API, tanpa file audio)
   - Text-to-speech Bahasa Indonesia (Web Speech API) — suara perempuan/laki-laki
   Semua berjalan di perangkat (client-side) → tidak memakai kuota Apps Script.
   ========================================================================== */
(function () {
  'use strict';
  const POLA_P = /(gadis|damayanti|female|wanita|perempuan|ayu|sari|siti|google bahasa indonesia|indonesian.*female)/i;
  const POLA_L = /(andika|ardi|male|pria|laki|rizky|budi|indonesian.*male)/i;
  const ANGKA = (n) => {
    const s = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    n = Math.floor(Number(n) || 0);
    if (n < 12) return s[n];
    if (n < 20) return ANGKA(n - 10) + ' belas';
    if (n < 100) return ANGKA(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + ANGKA(n % 10) : '');
    if (n < 200) return 'seratus' + (n > 100 ? ' ' + ANGKA(n - 100) : '');
    if (n < 1000) return ANGKA(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + ANGKA(n % 100) : '');
    return String(n);
  };
  let ctx = null, antre = Promise.resolve(), voices = [];
  const Suara = {
    didukung: 'speechSynthesis' in window,
    aktif: false,
    muatSuara() {
      if (!this.didukung) return [];
      voices = speechSynthesis.getVoices();
      return voices;
    },
    daftarIndonesia() { return this.muatSuara().filter((v) => /^(id|in)([-_]|$)/i.test(v.lang)); },
    /** Pilih suara + pitch untuk gender. Bila suara laki-laki tidak tersedia, nada diturunkan. */
    pilih(gender, namaPaksa) {
      const id = this.daftarIndonesia(), semua = this.muatSuara();
      if (namaPaksa) { const v = semua.find((x) => x.name === namaPaksa); if (v) return { voice: v, pitch: gender === 'laki-laki' && !POLA_L.test(v.name) ? 0.72 : 1 }; }
      const laki = gender === 'laki-laki';
      const cocok = id.find((v) => (laki ? POLA_L : POLA_P).test(v.name) && !(laki ? POLA_P : POLA_L).test(v.name));
      if (cocok) return { voice: cocok, pitch: 1 };
      const apa = id[0] || null;
      return { voice: apa, pitch: laki ? 0.72 : 1.08 };
    },
    /** Wajib dipanggil dari klik pengguna (kebijakan autoplay browser). */
    aktifkan() {
      try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { }
      if (this.didukung) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
      this.aktif = true;
    },
    chime() {
      return new Promise((res) => {
        try {
          ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === 'suspended') ctx.resume();
          const t0 = ctx.currentTime + 0.05, nada = [783.99, 659.25, 523.25];
          nada.forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
            const t = t0 + i * 0.42;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
            g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.08, t + 0.02); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
            o.connect(g).connect(ctx.destination); o2.connect(g2).connect(ctx.destination);
            o.start(t); o.stop(t + 1.2); o2.start(t); o2.stop(t + 0.7);
          });
          setTimeout(res, 1700);
        } catch (e) { res(); }
      });
    },
    /** "B-015" → "B, lima belas" */
    ejaNomor(no) {
      const m = String(no || '').match(/^([A-Za-z]+)[-\s]?0*(\d+)$/);
      if (!m) return String(no || '');
      return m[1].toUpperCase().split('').join(' ') + ', ' + ANGKA(Number(m[2]));
    },
    kalimat(p) {
      const ruang = String(p.ruang || '').replace(/\b0+(\d)/g, '$1');
      return 'Nomor antrean, ' + this.ejaNomor(p.no) + '. Silakan menuju ' + (p.nama_tujuan || 'loket') + (ruang ? ', ' + ruang : '') + '.';
    },
    ucap(teks, opt) {
      opt = opt || {};
      return new Promise((res) => {
        if (!this.didukung) return res();
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(teks), pil = this.pilih(opt.gender, opt.suara);
          u.lang = (pil.voice && pil.voice.lang) || 'id-ID'; if (pil.voice) u.voice = pil.voice;
          u.rate = Math.min(1.3, Math.max(0.6, Number(opt.kecepatan) || 0.9)); u.pitch = pil.pitch; u.volume = 1;
          let selesai = false; const akhir = () => { if (!selesai) { selesai = true; clearInterval(jaga); res(); } };
          u.onend = akhir; u.onerror = akhir;
          const jaga = setInterval(() => { if (speechSynthesis.paused) speechSynthesis.resume(); }, 2000);
          setTimeout(akhir, 15000);
          speechSynthesis.speak(u);
        } catch (e) { res(); }
      });
    },
    /** Masukkan panggilan ke antrean suara (tidak tumpang tindih). */
    umumkan(p, opt) {
      opt = opt || {};
      antre = antre.then(async () => {
        if (opt.chime !== false) await this.chime();
        const n = Math.min(3, Math.max(1, Number(opt.ulang) || 1));
        for (let i = 0; i < n; i++) { await this.ucap(this.kalimat(p), opt); await new Promise((r) => setTimeout(r, 600)); }
      }).catch(() => { });
      return antre;
    }
  };
  if (Suara.didukung) { Suara.muatSuara(); speechSynthesis.onvoiceschanged = () => Suara.muatSuara(); }
  window.Suara = Suara;
})();
