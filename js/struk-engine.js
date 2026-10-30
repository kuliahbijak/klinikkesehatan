/* ==========================================================================
   StrukEngine v1.0 (SIMRS Mini) — mesin model struk/tiket thermal 58/80 mm.
   Dibangun ulang mengikuti spesifikasi skill gas-struk-resi-printer:
   direktif baris [C][R][L][B][2][H][LR][-][=][BOX][QR][BAR][LOGO][FEED][CUT],
   penanda {{KUNCI|pengubah}}, blok {{#ITEM}}…{{/ITEM}} & {{?KUNCI}}…{{/KUNCI}}.
   Satu render → HTML pratinjau, teks/WA, PNG, dan byte ESC/POS.
   ========================================================================== */
(function () {
  'use strict';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const cfg = {
    rp: (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'),
    angka: (n) => Math.round(Number(n) || 0).toLocaleString('id-ID'),
    tgl: (s) => { s = String(s || ''); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}`; m = s.match(/^(\d{2})-(\d{2})-(\d{4})/); return m ? `${+m[1]} ${BLN[+m[2] - 1]} ${m[3]}` : s; },
    kanvas: () => document.createElement('canvas'),
    gambar: (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; })
  };
  const atur = (o) => Object.assign(cfg, o || {});

  /* ---------------------------------------------------------------- utilitas */
  const kosong = (v) => v === undefined || v === null || v === '' || v === 0 || v === '0' || (Array.isArray(v) && !v.length);
  function ambil(data, path) {
    let cur = data;
    for (const part of String(path).split('.')) {
      if (cur === undefined || cur === null) return undefined;
      const [nama, idx] = part.split('#');
      const kunci = Object.keys(cur).find((k) => k.toLowerCase() === nama.toLowerCase());
      cur = kunci === undefined ? undefined : cur[kunci];
      if (idx !== undefined) cur = Array.isArray(cur) ? cur[+idx] : undefined;
    }
    return cur;
  }
  const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'nol';
    const t = (x) => x < 12 ? SATUAN[x] : x < 20 ? t(x - 10) + ' belas' : x < 100 ? t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '') : x < 200 ? 'seratus' + (x > 100 ? ' ' + t(x - 100) : '') : x < 1000 ? t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '') : x < 2000 ? 'seribu' + (x > 1000 ? ' ' + t(x - 1000) : '') : x < 1e6 ? t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '') : x < 1e9 ? t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '') : t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
    return t(n);
  }
  function ubah(nilai, pengubah) {
    let v = nilai === undefined || nilai === null ? '' : nilai;
    for (const p of pengubah) {
      const i = p.indexOf(':'), nama = (i < 0 ? p : p.slice(0, i)).trim().toLowerCase(), arg = i < 0 ? '' : p.slice(i + 1);
      const s = String(v);
      switch (nama) {
        case 'kosong0': if (Number(v) === 0 && s.trim() !== '' && !isNaN(Number(s))) v = ''; break;
        case 'rp': v = s === '' ? '' : cfg.rp(Number(v)); break;
        case 'angka': v = s === '' ? '' : cfg.angka(Number(v)); break;
        case 'kapital': v = s.toUpperCase(); break;
        case 'kecil': v = s.toLowerCase(); break;
        case 'judul': v = s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); break;
        case 'tgl': v = s === '' ? '' : cfg.tgl(s); break;
        case 'terbilang': { if (s === '') break; const t = terbilang(Number(v)) + (arg.trim() === 'rupiah' ? ' rupiah' : ''); v = t.charAt(0).toUpperCase() + t.slice(1); break; }
        case 'potong': { const n = Number(arg) || 0; if (n && s.length > n) v = s.slice(0, Math.max(1, n - 1)) + '.'; break; }
        case 'bawaan': if (s === '') v = arg; break;
        case 'awal': if (s !== '') v = arg + s; break;
        case 'akhir': if (s !== '') v = s + arg; break;
      }
    }
    return v === undefined || v === null ? '' : String(v);
  }
  function ascii(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[•·]/g, '-').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/±/g, '+/-').replace(/²/g, '2').replace(/°/g, ' ').replace(/…/g, '...').replace(/×/g, 'x').replace(/½/g, '1/2')
      .replace(/[^\x20-\x7E]/g, '');
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------------------------------------------- blok */
  // Tag blok yang berdiri di barisnya sendiri dilebur (tidak meninggalkan baris kosong).
  function rataTag(isi) { return isi.replace(/^[ \t]*(\{\{[#?\/][^}]+\}\})[ \t]*\r?\n/gm, '$1'); }
  function ekspansi(teks, data) {
    const re = /\{\{([#?])\s*([\w.#]+)\s*\}\}/;
    let guard = 0;
    for (;;) {
      const m = teks.match(re); if (!m || ++guard > 500) break;
      const jenis = m[1], nama = m[2], awal = m.index, mulaiIsi = awal + m[0].length;
      // cari penutup yang cocok (hitung kedalaman untuk nama sama)
      const buka = new RegExp('\\{\\{[#?]\\s*' + nama.replace(/[.#]/g, '\\$&') + '\\s*\\}\\}|\\{\\{\\/\\s*' + nama.replace(/[.#]/g, '\\$&') + '\\s*\\}\\}', 'gi');
      buka.lastIndex = mulaiIsi; let dalam = 1, tutup = null, x;
      while ((x = buka.exec(teks))) { if (x[0].indexOf('{{/') === 0) { if (--dalam === 0) { tutup = x; break; } } else dalam++; }
      if (!tutup) { teks = teks.slice(0, awal) + teks.slice(mulaiIsi); continue; }
      const isi = teks.slice(mulaiIsi, tutup.index), sesudah = tutup.index + tutup[0].length;
      let ganti = '';
      const nilai = ambil(data, nama);
      if (jenis === '?') ganti = kosong(nilai) ? '' : isi;
      else if (Array.isArray(nilai)) {
        const pola = new RegExp('\\{\\{([#?\\/]?)\\s*' + nama.replace(/[.#]/g, '\\$&') + '\\.', 'gi');
        ganti = nilai.map((_, i) => isi.replace(pola, (s, p) => '{{' + p + nama + '#' + i + '.')).join('');
      }
      teks = teks.slice(0, awal) + ganti + teks.slice(sesudah);
    }
    return teks;
  }
  /** Ganti penanda; kembalikan {teks, ada, kosong} untuk aturan "baris kosong dibuang". */
  function isiPenanda(baris, data) {
    let ada = 0, kos = 0;
    const teks = baris.replace(/\{\{\s*([^{}|]+?)\s*((?:\|[^{}|]*)*)\}\}/g, (s, key, mods) => {
      ada++;
      const v = ubah(ambil(data, key.trim()), mods ? mods.split('|').slice(1) : []);
      if (v === '') kos++;
      return v;
    });
    return { teks, ada, kosong: ada > 0 && kos === ada };
  }

  /* ---------------------------------------------------------------- tata letak */
  function bungkus(teks, lebar) {
    const out = []; let baris = '';
    String(teks).split(/\s+/).filter((w) => w !== '').forEach((w) => {
      while (w.length > lebar) { if (baris) { out.push(baris); baris = ''; } out.push(w.slice(0, lebar)); w = w.slice(lebar); }
      if (!baris) baris = w; else if (baris.length + 1 + w.length <= lebar) baris += ' ' + w; else { out.push(baris); baris = w; }
    });
    if (baris) out.push(baris);
    return out.length ? out : [''];
  }
  function rata(t, lebar, a) {
    t = t.slice(0, lebar); const sisa = lebar - t.length;
    return a === 'C' ? ' '.repeat(Math.floor(sisa / 2)) + t + ' '.repeat(Math.ceil(sisa / 2)) : a === 'R' ? ' '.repeat(sisa) + t : t + ' '.repeat(sisa);
  }
  const DIREKTIF = /^\[(LR|BOX|QR|BAR|LOGO|FEED|CUT|C|R|L|B|2|H|-|=)\]/i;
  /** render(isi, data, kolom, {qr, logo, logoUrl, barcode}) → {lines, kolom, logo} */
  function render(isi, data, kolom, opsi) {
    opsi = Object.assign({ qr: true, logo: false, barcode: true }, opsi || {}); kolom = Number(kolom) || 32;
    data = data || {};
    const teks = ekspansi(rataTag(String(isi || '').replace(/\r/g, '')), data);
    const lines = [];
    teks.split('\n').forEach((raw) => {
      if (/^\s*\/\//.test(raw)) return;
      let s = raw, m; const d = { align: 'L', bold: false, size: 1, box: false, lr: false, jenis: 'teks' };
      while ((m = s.match(DIREKTIF))) {
        const k = m[1].toUpperCase(); s = s.slice(m[0].length);
        if (k === 'C' || k === 'R' || k === 'L') d.align = k; else if (k === 'B') d.bold = true; else if (k === '2') d.size = 2; else if (k === 'H') d.size = 'H';
        else if (k === 'LR') d.lr = true; else if (k === 'BOX') d.box = true;
        else if (k === '-' || k === '=') d.jenis = k; else d.jenis = k.toLowerCase();
      }
      if (d.jenis === '-' || d.jenis === '=') { lines.push({ t: 'garis', ch: d.jenis, text: d.jenis.repeat(kolom) }); return; }
      if (d.jenis === 'feed') { lines.push({ t: 'feed' }); return; }
      if (d.jenis === 'cut') { lines.push({ t: 'cut' }); return; }
      if (d.jenis === 'logo') { if (opsi.logo && opsi.logoUrl) lines.push({ t: 'logo', src: opsi.logoUrl }); return; }
      const p = isiPenanda(s, data);
      if (p.kosong) return;
      if (d.jenis === 'qr') { if (!opsi.qr) return; const v = p.teks.trim() || ubah(ambil(data, 'URL_VERIFIKASI'), []); if (v) lines.push({ t: 'qr', data: v }); return; }
      if (d.jenis === 'bar') { if (!opsi.barcode) return; const v = p.teks.trim(); if (v) lines.push({ t: 'bar', data: ascii(v) }); return; }
      const lebar = d.size === 2 ? Math.floor(kolom / 2) : kolom, gaya = { bold: d.bold, size: d.size, invert: d.box };
      if (d.lr) {
        const [ki, ka] = p.teks.split('||'); const kanan = (ka || '').trim(), kiri = (ki || '').trim();
        if (kanan.length > lebar - 4) { bungkus(kiri, lebar).forEach((b) => lines.push(Object.assign({ t: 'teks', text: rata(b, lebar, 'L') }, gaya))); bungkus(kanan, lebar).forEach((b) => lines.push(Object.assign({ t: 'teks', text: rata(b, lebar, 'R') }, gaya))); return; }
        const ruang = lebar - kanan.length - 1, bk = bungkus(kiri, Math.max(4, ruang));
        bk.forEach((b, i) => lines.push(Object.assign({ t: 'teks', text: i === 0 ? rata(b, lebar - kanan.length, 'L') + kanan : rata(b, lebar, 'L') }, gaya)));
        return;
      }
      if (d.box) { bungkus(p.teks.trim(), lebar - 2).forEach((b) => lines.push(Object.assign({ t: 'teks', text: rata(' ' + rata(b, lebar - 2, 'C') + ' ', lebar, 'C') }, gaya))); return; }
      if (!p.teks.trim()) { lines.push({ t: 'teks', text: ' '.repeat(lebar), bold: false, size: 1 }); return; }
      bungkus(p.teks, lebar).forEach((b) => lines.push(Object.assign({ t: 'teks', text: rata(b, lebar, d.align) }, gaya)));
    });
    return { lines, kolom, logo: opsi.logo ? opsi.logoUrl : '' };
  }
  function kolomUntuk(mm, lebarModel) { lebarModel = Number(lebarModel) || 0; if (Number(mm) === 80) return lebarModel >= 40 && lebarModel <= 64 ? lebarModel : 48; return lebarModel >= 24 && lebarModel < 40 ? lebarModel : 32; }

  /* ---------------------------------------------------------------- QR & Code128 */
  function qrMatriks(teks) {
    if (typeof window.qrcode !== 'function') return null;
    try { const q = window.qrcode(0, 'M'); q.addData(teks); q.make(); const n = q.getModuleCount(), m = []; for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c) ? 1 : 0); m.push(row); } return m; } catch (e) { return null; }
  }
  const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
  /** Pola modul Code128 (1 = batang). Angka genap ≥4 digit memakai set C. */
  function code128(teks) {
    teks = ascii(teks); const vals = [];
    if (/^\d+$/.test(teks) && teks.length >= 4 && teks.length % 2 === 0) { vals.push(105); for (let i = 0; i < teks.length; i += 2) vals.push(Number(teks.substr(i, 2))); }
    else { vals.push(104); for (const ch of teks) vals.push(ch.charCodeAt(0) - 32); }
    let sum = vals[0]; for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
    vals.push(sum % 103); vals.push(106);
    const mod = [];
    vals.forEach((v) => { C128[v].split('').forEach((w, i) => { for (let k = 0; k < +w; k++) mod.push(i % 2 === 0 ? 1 : 0); }); });
    return mod;
  }
  function kanvasQr(teks, sisi) {
    const m = qrMatriks(teks); if (!m) return null;
    const n = m.length, quiet = 2, unit = Math.max(2, Math.floor(sisi / (n + quiet * 2))), w = unit * (n + quiet * 2), c = cfg.kanvas();
    c.width = w; c.height = w; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, w); g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (m[r][k]) g.fillRect((k + quiet) * unit, (r + quiet) * unit, unit, unit);
    return c;
  }
  function kanvasBar(teks, maksLebar, tinggi) {
    const mod = code128(teks), quiet = 10, total = mod.length + quiet * 2, unit = Math.max(1, Math.min(3, Math.floor(maksLebar / total))), c = cfg.kanvas();
    c.width = total * unit; c.height = tinggi || 70; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    mod.forEach((b, i) => { if (b) g.fillRect((i + quiet) * unit, 0, unit, c.height); });
    return c;
  }
  const qrDataUrl = (t, s) => { const c = kanvasQr(t, s || 200); return c ? c.toDataURL('image/png') : ''; };
  const barcodeDataUrl = (t, w) => kanvasBar(t, w || 360, 60).toDataURL('image/png');

  /* ---------------------------------------------------------------- keluaran */
  function html(h) {
    const k = h.kolom;
    const isi = h.lines.map((l) => {
      if (l.t === 'garis') return `<div class="sk-l">${esc(l.text)}</div>`;
      if (l.t === 'feed') return '<div class="sk-l">&nbsp;</div>';
      if (l.t === 'cut') return '<div class="sk-cut"><span>✂ potong</span></div>';
      if (l.t === 'logo') return `<div class="sk-img"><img src="${esc(l.src)}" alt="logo" style="max-width:60%;max-height:80px"></div>`;
      if (l.t === 'qr') { const u = qrDataUrl(l.data, 220); return u ? `<div class="sk-img"><img src="${u}" alt="QR" style="width:${Math.min(62, Math.round((26 / k) * 100))}%;image-rendering:pixelated"></div>` : `<div class="sk-l" style="text-align:center">[QR: pustaka belum dimuat]</div>`; }
      if (l.t === 'bar') return `<div class="sk-img"><img src="${barcodeDataUrl(l.data, 380)}" alt="${esc(l.data)}" style="width:92%;height:46px;image-rendering:pixelated"><div class="sk-l" style="text-align:center">${esc(l.data)}</div></div>`;
      const cls = 'sk-l' + (l.bold ? ' sk-b' : '') + (l.size === 2 ? ' sk-2' : l.size === 'H' ? ' sk-h' : '') + (l.invert ? ' sk-inv' : '');
      return `<div class="${cls}">${esc(l.text) || '&nbsp;'}</div>`;
    }).join('');
    return `<div class="paper" style="--kolom:${k}">${isi}</div>`;
  }
  function teks(h) {
    return h.lines.map((l) => (l.t === 'teks' || l.t === 'garis' ? (l.size === 2 ? l.text.split('').join(' ').slice(0, h.kolom) : l.text).replace(/\s+$/, '') : l.t === 'feed' ? '' : l.t === 'cut' ? '' : l.t === 'qr' ? '' : l.t === 'bar' ? l.data : '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function panjangCm(h) { let mm = 4; h.lines.forEach((l) => { mm += l.t === 'qr' ? 32 : l.t === 'bar' ? 14 : l.t === 'logo' ? 14 : l.t === 'feed' ? 3.5 : l.t === 'cut' ? 6 : l.size === 2 || l.size === 'H' ? 7 : 3.75; }); return Math.round(mm) / 10; }
  /** Raster GS v 0 dari kanvas (lebar dibulatkan ke kelipatan 8, rata tengah). */
  function raster(c, lebarDot) {
    const w = Math.min(lebarDot, c.width), x0 = Math.floor((lebarDot - w) / 2), bpr = Math.ceil(lebarDot / 8), hgt = c.height;
    const g = c.getContext('2d'), px = g.getImageData(0, 0, c.width, hgt).data, out = new Uint8Array(8 + bpr * hgt);
    out.set([0x1d, 0x76, 0x30, 0x00, bpr & 0xff, (bpr >> 8) & 0xff, hgt & 0xff, (hgt >> 8) & 0xff]);
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
      const i = (y * c.width + x) * 4, gelap = px[i + 3] > 128 && (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) < 140;
      if (gelap) { const X = x + x0; out[8 + y * bpr + (X >> 3)] |= 0x80 >> (X & 7); }
    }
    return out;
  }
  async function escpos(h, o) {
    o = o || {}; const lebarDot = h.kolom >= 40 ? 576 : 384, parts = [], push = (a) => parts.push(a instanceof Uint8Array ? a : new Uint8Array(a)), enc = (s) => Array.from(ascii(s)).map((c) => c.charCodeAt(0));
    push([0x1b, 0x40]);
    if (o.density) push([0x1b, 0x37, 7, Math.min(255, 80 + o.density * 50), 2]);
    for (const l of h.lines) {
      if (l.t === 'teks' || l.t === 'garis') {
        push([0x1b, 0x61, 0, 0x1b, 0x45, l.bold ? 1 : 0, 0x1d, 0x21, l.size === 2 ? 0x11 : l.size === 'H' ? 0x01 : 0x00, 0x1d, 0x42, l.invert ? 1 : 0]);
        push(enc(l.invert ? l.text : l.text.replace(/\s+$/, ''))); push([0x0a]);
        push([0x1d, 0x42, 0, 0x1d, 0x21, 0, 0x1b, 0x45, 0]);
      } else if (l.t === 'feed') push([0x1b, 0x64, 1]);
      else if (l.t === 'cut') { push([0x1b, 0x64, 3]); if (o.autoCut !== false) push([0x1d, 0x56, 66, 0]); }
      else if (l.t === 'qr') { const c = kanvasQr(l.data, 240); if (c) { push(raster(c, lebarDot)); push([0x0a]); } }
      else if (l.t === 'bar') { const c = kanvasBar(l.data, lebarDot - 16, 64); push(raster(c, lebarDot)); push(enc(' '.repeat(Math.max(0, Math.floor((h.kolom - l.data.length) / 2))) + l.data)); push([0x0a]); }
      else if (l.t === 'logo') {
        try { const img = await cfg.gambar(l.src), c = cfg.kanvas(), w = Math.min(lebarDot * 0.6, img.width), hh = Math.round(img.height * (w / img.width)); c.width = Math.round(w); c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, hh); g.drawImage(img, 0, 0, c.width, hh); push(raster(c, lebarDot)); } catch (e) { /* logo tanpa CORS dilewati */ }
      }
    }
    if (!h.lines.length || h.lines[h.lines.length - 1].t !== 'cut') { push([0x1b, 0x64, 3]); if (o.autoCut) push([0x1d, 0x56, 66, 0]); }
    if (o.beep) push([0x1b, 0x42, 2, 2]);
    const total = parts.reduce((s, a) => s + a.length, 0), out = new Uint8Array(total); let off = 0; parts.forEach((a) => { out.set(a, off); off += a.length; });
    return out;
  }
  async function png(h) {
    const W = h.kolom >= 40 ? 576 : 384, cw = W / h.kolom, fs = Math.floor(cw / 0.6), lh = Math.round(fs * 1.25), c = cfg.kanvas();
    let H = 16; const tinggi = (l) => l.t === 'qr' ? 250 : l.t === 'bar' ? 90 : l.t === 'logo' ? 100 : l.t === 'cut' ? 26 : l.t === 'feed' ? lh : l.size === 2 || l.size === 'H' ? lh * 2 : lh;
    h.lines.forEach((l) => { H += tinggi(l); }); c.width = W; c.height = H + 16;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top';
    let y = 8;
    for (const l of h.lines) {
      if (l.t === 'teks' || l.t === 'garis') {
        const besar = l.size === 2, tinggiH = l.size === 'H';
        g.font = `${l.bold ? 'bold ' : ''}${fs}px "Courier New", monospace`;
        if (l.invert) { g.fillStyle = '#000'; g.fillRect(0, y - 2, W, (besar || tinggiH ? lh * 2 : lh)); g.fillStyle = '#fff'; } else g.fillStyle = '#000';
        g.save(); g.translate(0, y); g.scale(besar ? 2 : 1, besar || tinggiH ? 2 : 1);
        for (let i = 0; i < l.text.length; i++) g.fillText(l.text[i], i * cw, 0);
        g.restore();
      } else if (l.t === 'qr') { const q = kanvasQr(l.data, 240); if (q) g.drawImage(q, (W - q.width) / 2, y); }
      else if (l.t === 'bar') { const b = kanvasBar(l.data, W - 20, 64); g.drawImage(b, (W - b.width) / 2, y); g.fillStyle = '#000'; g.font = `${fs}px monospace`; g.fillText(l.data, (W - l.data.length * cw) / 2, y + 68); }
      else if (l.t === 'cut') { g.strokeStyle = '#999'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(0, y + 12); g.lineTo(W, y + 12); g.stroke(); g.setLineDash([]); }
      else if (l.t === 'logo') { try { const img = await cfg.gambar(l.src), w = Math.min(W * 0.6, img.width), hh = Math.min(90, img.height * (w / img.width)); g.drawImage(img, (W - w) / 2, y, w, hh); } catch (e) { } }
      y += tinggi(l);
    }
    return c.toDataURL('image/png');
  }

  window.StrukEngine = { atur, render, html, teks, png, escpos, panjangCm, ubah, terbilang, code128, qrDataUrl, barcodeDataUrl, ascii, esc, kolomUntuk, _ambil: ambil, _ekspansi: ekspansi };
})();
