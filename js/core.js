/* ==========================================================================
   SIMRS Mini — core.js : utilitas, klien API (dedupe + batch + SWR + perf),
   sesi, UI (toast/modal/konfirmasi), router hash, polling adaptif, grafik.
   ========================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, cls) => `<span class="ms ${cls || ''}" aria-hidden="true">${n}</span>`;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------- format */
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const F = {
    angka: (n) => Math.round(Number(n) || 0).toLocaleString('id-ID'),
    rp: (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'),
    ringkas: (n) => { n = Number(n) || 0; const a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(1).replace('.0', '') + ' M' : a >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' jt' : a >= 1e3 ? (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.0', '') + ' rb' : String(n); },
    tgl: (t) => { const p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? `${+p[2]} ${BLN[+p[1] - 1]} ${p[0]}` : (t || ''); },
    tglPanjang: (d) => { d = d || new Date(); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; },
    jam: (d) => { d = d || new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
    iso: (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    umur: (t) => { if (!/^\d{4}-\d{2}-\d{2}/.test(t || '')) return ''; const b = new Date(t + 'T00:00:00'), n = new Date(); let y = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--; if (y >= 1) return y + ' Th'; const m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth() - (n.getDate() < b.getDate() ? 1 : 0); return Math.max(0, m) + ' Bln'; },
    jk: (j) => (j === 'P' ? 'Perempuan' : j === 'L' ? 'Laki-laki' : '-'),
    inisial: (n) => String(n || '?').replace(/^(dr|drg|ny|tn|an|apt)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?',
    sapa: () => { const h = new Date().getHours(); return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam'; },
    relatif: (s) => { const t = new Date(String(s).replace(' ', 'T')); if (isNaN(t)) return s || ''; const d = Math.round((Date.now() - t) / 60000); return d < 1 ? 'baru saja' : d < 60 ? d + ' menit lalu' : d < 1440 ? Math.floor(d / 60) + ' jam lalu' : F.tgl(s); },
    hp: (h) => String(h || '').replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3')
  };
  const TERBILANG = (n) => {
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n < 12) return s[n];
    if (n < 20) return TERBILANG(n - 10) + ' belas';
    if (n < 100) return TERBILANG(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + TERBILANG(n % 10) : '');
    if (n < 200) return 'seratus' + (n > 100 ? ' ' + TERBILANG(n - 100) : '');
    if (n < 1000) return TERBILANG(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + TERBILANG(n % 100) : '');
    if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + TERBILANG(n - 1000) : '');
    if (n < 1e6) return TERBILANG(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + TERBILANG(n % 1000) : '');
    if (n < 1e9) return TERBILANG(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + TERBILANG(n % 1e6) : '');
    return TERBILANG(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + TERBILANG(n % 1e9) : '');
  };

  /* ------------------------------------------------------------- pengukur */
  const Perf = {
    log: [],
    add(a, total, server, cached) { this.log.push({ aksi: a, total: Math.round(total), server: server || 0, net: Math.max(0, Math.round(total - (server || 0))), cache: cached ? '✓' : '' }); if (this.log.length > 200) this.log.shift(); },
    table() { console.table(this.log.slice(-30)); },
    summary() { const g = {}; this.log.forEach((x) => { const s = g[x.aksi] || (g[x.aksi] = { n: 0, total: 0, server: 0 }); s.n++; s.total += x.total; s.server += x.server; }); console.table(Object.keys(g).map((k) => ({ aksi: k, n: g[k].n, rata_total: Math.round(g[k].total / g[k].n), rata_server: Math.round(g[k].server / g[k].n) }))); }
  };

  /* ------------------------------------------------------------- sesi & penyimpanan */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } },
    hapusAwalan(p) { try { Object.keys(localStorage).forEach((k) => { if (k.indexOf(p) === 0) localStorage.removeItem(k); }); } catch (e) { } }
  };
  const Sesi = {
    data: LS.get('simrs.sesi', null),
    get token() { return this.data ? this.data.token : ''; },
    get me() { return this.data ? this.data.me : null; },
    simpan(token, me) { this.data = { token, me, t: Date.now() }; LS.set('simrs.sesi', this.data); },
    hapus() { this.data = null; LS.del('simrs.sesi'); LS.hapusAwalan('simrs.c.'); Mem.clear(); },
    habis(pesan) { this.hapus(); document.dispatchEvent(new CustomEvent('sesi-habis', { detail: pesan || 'Sesi Anda berakhir. Silakan masuk kembali.' })); }
  };
  /** Cache lokal: data referensi (tanpa data pasien) di localStorage; data pasien hanya di memori. */
  const Mem = new Map();
  const Store = {
    get(key) { const m = Mem.get(key); if (m) return m; const v = LS.get('simrs.c.' + key, null); if (v) Mem.set(key, v); return v; },
    set(key, v, phi) { const o = { t: Date.now(), v, h: hash(JSON.stringify(v)) }; Mem.set(key, o); if (!phi) LS.set('simrs.c.' + key, o); return o; },
    del(key) { Mem.delete(key); LS.del('simrs.c.' + key); }
  };
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  /* ------------------------------------------------------------- API */
  const urlOk = () => CFG.GAS_URL && /^https?:\/\//.test(CFG.GAS_URL) && !/GANTI|XXXX/.test(CFG.GAS_URL);
  const READ = /^(boot|dashboard|antrean\.(hariIni|info|publik)|pasien\.(cari|get)|obat\.(list|log)|farmasi\.antrean|kasir\.(antrean|detail)|laporan\.data|pengguna\.list|keamanan\.status|audit\.list|sistem\.status|icd\.cari|struk\.(list|semua|detail)|printer\.get|rme\.riwayat|auth\.(me|config)|display\.data|verifikasi)$/;
  let inflight = {}, epoch = 0;
  async function kirim(action, data, opts) {
    opts = opts || {};
    if (!urlOk()) return { success: false, code: 'CONFIG', message: 'GAS_URL di js/config.js belum diisi dengan URL /exec Web App.' };
    const t0 = performance.now();
    let json;
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opts.timeout || 60000);
      const res = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: opts.tanpaToken ? '' : Sesi.token, data: data || {} }), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(to);
      json = await res.json();
    } catch (e) {
      json = { success: false, code: 'NET', message: navigator.onLine === false ? 'Perangkat sedang offline. Periksa koneksi internet.' : 'Tidak dapat terhubung ke server. Coba lagi sebentar.' };
    }
    Perf.add(action, performance.now() - t0, json.ms, json.data && json.data.cached);
    if (json.code === 'AUTH' && !opts.tanpaToken) Sesi.habis(json.message);
    if (json.nq) scheduleDrain();
    return json;
  }
  /** Penggabung baca dalam satu tik → satu eksekusi 'batch' (hemat cold start). */
  const Batcher = {
    q: null,
    add(action, data) { return new Promise((res) => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data: data || {}, res }); }); },
    async flush() {
      const q = this.q; this.q = null;
      const uniq = [];
      q.forEach((c) => { const k = c.action + JSON.stringify(c.data); const u = uniq.find((x) => x.k === k); if (u) u.list.push(c); else uniq.push({ k, action: c.action, data: c.data, list: [c] }); });
      for (let i = 0; i < uniq.length; i += 10) {
        const part = uniq.slice(i, i + 10);
        if (part.length === 1) { const r = await kirim(part[0].action, part[0].data); part[0].list.forEach((c) => c.res(r)); continue; }
        const r = await kirim('batch', { calls: part.map((p) => ({ action: p.action, data: p.data })) });
        part.forEach((p, j) => { const one = r.success ? r.data[j] : r; if (one && one.code === 'AUTH') Sesi.habis(one.message); p.list.forEach((c) => c.res(one)); });
      }
    }
  };
  function api(action, data, opts) {
    opts = opts || {};
    if (!READ.test(action) || opts.langsung) { if (!READ.test(action)) epoch++; return kirim(action, data, opts); }
    const k = epoch + '|' + action + '|' + Sesi.token.slice(-8) + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = opts.tanpaToken ? kirim(action, data, opts) : Batcher.add(action, data);
    inflight[k] = p; p.finally(() => delete inflight[k]);
    return p;
  }
  /** Stale-while-revalidate: tampilkan cache dulu, segarkan bila basi. render(data, dariCache) */
  async function swr(key, action, data, render, opt) {
    opt = opt || {};
    const c = Store.get(key);
    if (c && render) render(c.v, true);
    if (c && !opt.paksa && Date.now() - c.t < (opt.maxAge || 30000)) return c.v;
    const d = Object.assign({}, data || {}); if (opt.paksa) d._fresh = true;
    const r = await api(action, d);
    if (!r.success) { if (!c && render) render(null, false, r); else if (opt.paksa || !c) UI.toast('Gagal memuat', r.message, 'err'); return c ? c.v : null; }
    const baru = Store.set(key, r.data, opt.phi);
    if (render && (!c || c.h !== baru.h)) render(r.data, false);
    return r.data;
  }
  let drainT = null, drainN = 0;
  function scheduleDrain() { clearTimeout(drainT); drainT = setTimeout(async () => { const r = await kirim('drain', {}, { tanpaToken: true }); if (r.success && r.data.left > 0 && ++drainN < 3) scheduleDrain(); else drainN = 0; }, 400); }
  function warmUp(scope) {
    if (!urlOk()) return;
    const k = 'simrs.warm.' + scope, t = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - t < 240000) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => { });
  }

  /* ------------------------------------------------------------- UI */
  const UI = {
    toast(judul, isi, jenis) {
      let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const t = document.createElement('div'); t.className = 'toast ' + (jenis || '');
      t.innerHTML = ik(jenis === 'err' ? 'error' : jenis === 'warn' ? 'warning' : 'check_circle') + `<div><b>${esc(judul)}</b>${isi ? `<span>${esc(isi)}</span>` : ''}</div>`;
      box.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, jenis === 'err' ? 6500 : 3800);
    },
    /** modal({judul, isi: html|Node, aksi:[{label, kelas, onClick(close) → false utk tetap buka}], lebar:'wide'|'sm', onTutup}) */
    modal(o) {
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal ${o.lebar || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.judul || '')}"><div class="modal-h"><h3>${o.judulHtml || esc(o.judul || '')}</h3><button class="btn icon ghost sm" data-x aria-label="Tutup">${ik('close')}</button></div><div class="modal-b"></div>${o.aksi && o.aksi.length ? '<div class="modal-f"></div>' : ''}</div>`;
      const body = $('.modal-b', bg);
      if (typeof o.isi === 'string') body.innerHTML = o.isi; else if (o.isi) body.appendChild(o.isi);
      const prevFocus = document.activeElement;
      const tutup = () => { bg.remove(); document.removeEventListener('keydown', key); if (o.onTutup) o.onTutup(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
      const key = (e) => { if (e.key === 'Escape' && document.body.lastElementChild === bg) tutup(); };
      document.addEventListener('keydown', key);
      $('[data-x]', bg).onclick = tutup;
      bg.addEventListener('mousedown', (e) => { if (e.target === bg && !o.wajib) tutup(); });
      (o.aksi || []).forEach((a) => {
        const b = document.createElement('button'); b.className = 'btn ' + (a.kelas || 'secondary'); b.innerHTML = (a.ikon ? ik(a.ikon, 's18') : '') + esc(a.label);
        b.onclick = async () => { if (a.onClick) { const r = await a.onClick(tutup, b, bg); if (r === false) return; } tutup(); };
        $('.modal-f', bg).appendChild(b);
      });
      document.body.appendChild(bg);
      const f = $('input,select,textarea,button:not([data-x])', body) || $('.modal-f .btn:last-child', bg); if (f && !o.tanpaFokus) setTimeout(() => f.focus(), 30);
      return { tutup, el: bg, body };
    },
    konfirmasi(teks, o) {
      o = o || {};
      return new Promise((res) => {
        let ok = false;
        UI.modal({ judul: o.judul || 'Konfirmasi', lebar: 'sm', isi: `<p class="t-sm" style="color:var(--ink-2)">${esc(teks)}</p>`, onTutup: () => res(ok),
          aksi: [{ label: o.batal || 'Batal', kelas: 'secondary' }, { label: o.ok || 'Ya, lanjutkan', kelas: o.bahaya ? 'danger' : 'primary', onClick: () => { ok = true; } }] });
      });
    },
    tanya(judul, label, o) {
      o = o || {};
      return new Promise((res) => {
        let nilai = null;
        const m = UI.modal({ judul, lebar: 'sm', isi: `<div class="field"><label>${esc(label)}</label>${o.area ? `<textarea class="ta white" rows="3"></textarea>` : `<input class="inp white" type="${o.tipe || 'text'}" autocomplete="off">`}${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}</div>`,
          onTutup: () => res(nilai),
          aksi: [{ label: 'Batal' }, { label: o.ok || 'Simpan', kelas: o.bahaya ? 'danger' : 'primary', onClick: () => { const v = $('input,textarea', m.body).value.trim(); if (o.wajib && !v) { $('input,textarea', m.body).classList.add('salah'); return false; } nilai = v; } }] });
        const inp = $('input,textarea', m.body); if (o.nilai) inp.value = o.nilai;
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !o.area) $('.modal-f .btn:last-child', m.el).click(); });
      });
    },
    async sibuk(btn, fn) {
      if (btn.disabled) return; const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.sibuk || 'Memproses…');
      try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
    },
    tip: null,
    tampilTip(e, html) { if (!this.tip) { this.tip = document.createElement('div'); this.tip.className = 'tip'; document.body.appendChild(this.tip); } this.tip.innerHTML = html; this.tip.style.display = 'block'; const w = this.tip.offsetWidth; let x = e.clientX + 12, y = e.clientY - 40; if (x + w > innerWidth - 8) x = e.clientX - w - 12; this.tip.style.left = x + 'px'; this.tip.style.top = Math.max(8, y) + 'px'; },
    sembunyiTip() { if (this.tip) this.tip.style.display = 'none'; },
    kosong(teks, ikon) { return `<div class="empty">${ik(ikon || 'inbox')}<div class="t-sm">${esc(teks)}</div></div>`; },
    skel(n) { return Array.from({ length: n || 4 }, () => '<div class="skel" style="height:44px;margin:.5rem 0"></div>').join(''); },
    badgeStatus(s) {
      const m = { Menunggu: 'warn', Dipanggil: 'info', Diperiksa: 'teal', 'Selesai Periksa': 'ok', Selesai: 'ok', Batal: 'danger', Draft: '', Disiapkan: 'info', 'Siap Diambil': 'warn', Diserahkan: 'ok', Lunas: 'ok', 'Belum Bayar': 'danger', 'Tanpa Resep': '', Darurat: 'danger', Prioritas: 'warn' };
      const dot = ['Dipanggil', 'Diperiksa'].indexOf(s) >= 0 ? '<span class="dot pulse"></span>' : '<span class="dot"></span>';
      return `<span class="badge ${m[s] || ''}">${dot}${esc(s)}</span>`;
    }
  };

  /* ------------------------------------------------------------- polling adaptif */
  const Activity = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach((ev) => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
    idle() { return Date.now() - this.at > 120000; },
    due(key, aktifMs, idleMs) { if (document.visibilityState !== 'visible') return false; if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : aktifMs) - 500) return false; this.last[key] = Date.now(); return true; }
  };

  /* ------------------------------------------------------------- router hash */
  const Router = {
    rute: {}, saatIni: null, sebelumKeluar: null,
    parse() { const h = location.hash.replace(/^#\/?/, ''); const [p, q] = h.split('?'); const seg = p.split('/').filter(Boolean); const params = {}; new URLSearchParams(q || '').forEach((v, k) => { params[k] = v; }); return { seg, params, path: '/' + seg.join('/') }; },
    go(path) { if (location.hash === '#' + path) this.jalankan(); else location.hash = path; },
    jalankan() { document.dispatchEvent(new CustomEvent('rute', { detail: this.parse() })); }
  };
  addEventListener('hashchange', () => Router.jalankan());

  /* ------------------------------------------------------------- unduh & berkas */
  const Berkas = {
    unduhBlob(blob, nama) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); },
    unduhBase64(b64, nama, mime) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); Berkas.unduhBlob(new Blob([u], { type: mime || 'application/octet-stream' }), nama); },
    keBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); }); },
    bacaTeks(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(file); }); },
    csv(teks) {
      const rows = []; let row = [], cell = '', q = false; teks = teks.replace(/^﻿/, '');
      const sep = (teks.split('\n')[0].match(/;/g) || []).length > (teks.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
      for (let i = 0; i < teks.length; i++) {
        const c = teks[i];
        if (q) { if (c === '"' && teks[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
        else if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
      }
      if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
      const h = (rows.shift() || []).map((x) => x.trim());
      return rows.filter((r) => r.some((x) => String(x).trim() !== '')).map((r) => { const o = {}; h.forEach((k, i) => { o[k] = (r[i] || '').trim(); }); return o; });
    },
    keCsv(rows, kolom) { const e = (v) => { v = v === undefined || v === null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return '﻿' + [kolom.map((k) => e(k.label || k)).join(',')].concat(rows.map((r) => kolom.map((k) => e(r[k.key || k])).join(','))).join('\n'); }
  };
  const _skrip = {};
  function muatSkrip(src) { if (!_skrip[src]) _skrip[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete _skrip[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }); return _skrip[src]; }

  /* ------------------------------------------------------------- grafik (SVG, satu seri) */
  const Grafik = {
    /** Kolom vertikal: data=[{label, nilai, sorot}] opsi {tinggi, format, labelX} */
    kolom(el, data, opsi) {
      opsi = opsi || {}; const fmt = opsi.format || F.angka;
      if (opsi.kosong && !data.some((d) => d.nilai)) { el.innerHTML = UI.kosong(opsi.kosong, 'bar_chart'); return; }
      const draw = () => {
        const W = Math.max(260, el.clientWidth || 600), H = opsi.tinggi || 200, padL = 40, padB = 26, padT = 18, ih = H - padB - padT, iw = W - padL - 8;
        const max = Math.max(1, ...data.map((d) => d.nilai)), step = Math.max(opsi.desimal ? 0 : 1, niceStep(max)), top = Math.ceil(max / step) * step;
        const n = data.length, slot = iw / Math.max(1, n), bw = Math.min(24, slot * 0.55);
        let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(opsi.judul || 'Grafik')}">`;
        for (let v = 0; v <= top + 0.0001; v += step) { const y = padT + ih - (v / top) * ih; s += `<line class="grid-l" x1="${padL}" x2="${W - 4}" y1="${y}" y2="${y}"/><text class="axis-t" x="${padL - 6}" y="${y + 4}" text-anchor="end">${esc(F.ringkas(v))}</text>`; }
        const tiapLabel = Math.ceil(n / Math.floor(iw / 46));
        data.forEach((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2, h = Math.max(d.nilai ? 2 : 0, (d.nilai / top) * ih), y = padT + ih - h, r = Math.min(4, bw / 2, h);
          const path = h > 0 ? `M${x},${padT + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${padT + ih} Z` : '';
          s += `<g class="grp" data-i="${i}"><rect class="hit" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ih + padB}"/>${path ? `<path class="mk ${d.sorot === false || (opsi.sorotAkhir && i !== n - 1) ? 'dim' : ''}" d="${path}"/>` : ''}`;
          if ((opsi.labelNilai !== false) && (n <= 14 || i === n - 1) && d.nilai) s += `<text class="val-t" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${esc(F.ringkas(d.nilai))}</text>`;
          if (i % tiapLabel === 0 || i === n - 1) s += `<text class="axis-t" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
          s += '</g>';
        });
        el.innerHTML = '<div class="chart">' + s + '</svg></div>';
        $$('.grp', el).forEach((g) => { const d = data[+g.dataset.i]; g.addEventListener('pointermove', (e) => UI.tampilTip(e, `<b>${esc(fmt(d.nilai))}</b>${esc(d.judul || d.label)}`)); g.addEventListener('pointerleave', () => UI.sembunyiTip()); });
      };
      draw(); Grafik._resize(el, draw);
    },
    /** Batang horizontal (HTML): data=[{label, nilai, sub}] */
    batang(el, data, opsi) {
      opsi = opsi || {}; const fmt = opsi.format || F.angka, max = Math.max(1, ...data.map((d) => d.nilai));
      if (!data.length) { el.innerHTML = UI.kosong(opsi.kosong || 'Belum ada data', 'bar_chart'); return; }
      el.innerHTML = '<div class="hbar">' + data.map((d, i) => `<div class="hbar-r" data-i="${i}"><span class="trunc">${d.kode ? `<span class="mono teal b">${esc(d.kode)}</span> ` : ''}${esc(d.label)}</span><span class="mono sb">${esc(fmt(d.nilai))}</span><div class="tr"><div class="fl" style="width:${Math.max(1.5, (d.nilai / max) * 100)}%"></div></div></div>`).join('') + '</div>';
      $$('.hbar-r', el).forEach((r) => { const d = data[+r.dataset.i]; r.addEventListener('pointermove', (e) => UI.tampilTip(e, `<b>${esc(fmt(d.nilai))}</b>${esc((d.kode ? d.kode + ' ' : '') + d.label)}`)); r.addEventListener('pointerleave', () => UI.sembunyiTip()); });
    },
    _resize(el, draw) { if (el._ro) el._ro.disconnect(); let w = el.clientWidth; el._ro = new ResizeObserver(debounce(() => { if (Math.abs(el.clientWidth - w) > 8) { w = el.clientWidth; draw(); } }, 120)); el._ro.observe(el); }
  };
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }

  /* ------------------------------------------------------------- kalender */
  function kalender(tahun, bulan) {
    const awal = new Date(tahun, bulan, 1), mulai = awal.getDay(), jml = new Date(tahun, bulan + 1, 0).getDate(), lalu = new Date(tahun, bulan, 0).getDate(), now = new Date();
    let s = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => `<div class="dh">${d}</div>`).join('');
    for (let i = mulai - 1; i >= 0; i--) s += `<div class="d x">${lalu - i}</div>`;
    for (let d = 1; d <= jml; d++) { const today = d === now.getDate() && bulan === now.getMonth() && tahun === now.getFullYear(); s += `<div class="d ${today ? 'today' : ''}">${today ? `<span>${d}</span>` : d}</div>`; }
    const sisa = (7 - ((mulai + jml) % 7)) % 7; for (let d = 1; d <= sisa; d++) s += `<div class="d x">${d}</div>`;
    return { html: s, judul: BULAN[bulan] + ' ' + tahun };
  }

  window.S = { CFG, $, $$, esc, ik, debounce, sleep, F, TERBILANG, Perf, LS, Sesi, Store, Mem, api, kirim, swr, warmUp, scheduleDrain, UI, Activity, Router, Berkas, muatSkrip, Grafik, kalender, urlOk, BULAN };
  window.Perf = Perf;
  Activity.init();
})();
