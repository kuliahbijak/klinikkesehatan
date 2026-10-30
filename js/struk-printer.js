/* ==========================================================================
   StrukPrinter v1.0 (SIMRS Mini) — pengaturan berlapis & jalur cetak:
   bawaan modul ← default Admin (server) ← pilihan perangkat (localStorage) ← opsi sesaat.
   Metode: 'bt' (Web Bluetooth ESC/POS) | 'rawbt' (intent Android) | 'browser' (dialog cetak).
   Gagal Bluetooth/RawBT → otomatis jatuh ke dialog cetak browser.
   ========================================================================== */
(function () {
  'use strict';
  const LS_KEY = 'struk.printer.v1';
  const BAWAAN = { lebar: 58, antrean58: 'TIKET_58', antrean80: 'TIKET_80', struk58: 'STRUK_58', struk80: 'STRUK_80', qr: true, logo: false, header: 'lengkap', rangkap: 1, density: 0, autoCut: true, beep: false, metode: 'browser' };
  const CADANGAN = { ANTREAN: '[C][B]{{TOKO_NAMA}}\n[=]\n[C]NOMOR ANTREAN\n[C][B][2]{{NO_ANTREAN}}\n[C]{{POLI}}\n[-]\n[LR]Tanggal||{{TANGGAL|tgl}} {{JAM}}\n[LR]Pasien||{{PASIEN}}\n[FEED]\n[CUT]', STRUK: '[C][B]{{TOKO_NAMA}}\n[=]\n[LR]No||{{NOTA}}\n[LR]Tanggal||{{TANGGAL|tgl}}\n[-]\n{{#ITEM}}\n[LR]{{ITEM.NAMA}}||{{ITEM.SUB|angka}}\n{{/ITEM}}\n[-]\n[B][LR]TOTAL||{{TOTAL|rp}}\n[BOX]{{STATUS}}\n[FEED]\n[CUT]' };
  let T = [], SERVER = {}, APP_URL = '', LOGO = '', onPutus = null;
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; } };
  const lsSet = (o) => { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { } };

  const P = {
    BAWAAN,
    pasang(o) {
      o = o || {};
      if (o.templates) T = o.templates;
      if (o.server) SERVER = o.server;
      if (o.appUrl !== undefined) APP_URL = String(o.appUrl || '').replace(/\/?$/, '/');
      if (o.logoUrl !== undefined) LOGO = o.logoUrl;
      if (o.onPutus) onPutus = o.onPutus;
    },
    pengaturan(sesaat) { return Object.assign({}, BAWAAN, SERVER || {}, lsGet(), sesaat || {}); },
    bawaanServer() { return Object.assign({}, BAWAAN, SERVER || {}); },
    lokal() { return lsGet(); },
    simpanLokal(st) { const cur = lsGet(); Object.keys(st || {}).forEach((k) => { if (k in BAWAAN) cur[k] = st[k]; }); lsSet(cur); },
    resetLokal() { lsSet({}); },
    daftar(jenis) { return T.filter((t) => !jenis || t.jenis === jenis); },
    template(kode, jenis) {
      return T.find((t) => t.kode === kode) || T.find((t) => t.jenis === jenis) || { kode: 'CADANGAN', nama: 'Model cadangan', jenis, lebar: 32, isi: CADANGAN[jenis] || CADANGAN.STRUK };
    },
    pilihKode(st, jenis) { return st[String(jenis || '').toLowerCase() + (Number(st.lebar) === 80 ? '80' : '58')] || ''; },
    siapkan(data, o) {
      o = o || {};
      const st = P.pengaturan(o.opsi || {}), jenis = o.jenis || 'STRUK';
      const tpl = P.template(o.kode || P.pilihKode(st, jenis), jenis);
      const kolom = StrukEngine.kolomUntuk(st.lebar, tpl.lebar);
      const d = Object.assign({}, data || {}, { HEADER_LENGKAP: st.header === 'lengkap' ? 'YA' : '', HEADER_RINGKAS: st.header !== 'lengkap' ? 'YA' : '' });
      const h = StrukEngine.render(tpl.isi, d, kolom, { qr: st.qr, logo: st.logo, logoUrl: LOGO, barcode: true });
      return Object.assign(h, { tpl, st, data: d, jenis });
    },
    /** Cetak hasil siapkan(). Mengembalikan {cara, cadangan?}. */
    async cetak(h, st) {
      st = st || h.st || P.pengaturan();
      const n = Math.max(1, Math.min(3, Number(st.rangkap) || 1));
      if (st.metode === 'bt' || st.metode === 'rawbt') {
        try {
          const one = await StrukEngine.escpos(h, { autoCut: st.autoCut, beep: st.beep, density: st.density });
          const all = new Uint8Array(one.length * n); for (let i = 0; i < n; i++) all.set(one, i * one.length);
          if (st.metode === 'bt') { await P.BT.kirim(all); return { cara: 'bt' }; }
          P.rawbt(all); return { cara: 'rawbt' };
        } catch (e) { P.cetakBrowser(h, n); return { cara: 'browser', cadangan: (st.metode === 'bt' ? 'Bluetooth' : 'RawBT') + ' gagal: ' + (e && e.message ? e.message : e) }; }
      }
      P.cetakBrowser(h, n); return { cara: 'browser' };
    },
    cetakBrowser(h, salinan) {
      const mm = h.kolom >= 40 ? 80 : 58, satu = StrukEngine.html(h);
      const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
      document.body.appendChild(f);
      const doc = f.contentDocument;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cetak</title><style>
        @page{size:${mm}mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}
        .paper{width:${mm === 80 ? 72 : 48}mm;margin:0 auto;padding:2mm 0;font-family:"Courier New",monospace;color:#000;font-size:${mm === 80 ? 11.2 : 11.1}px;line-height:1.3}
        .sk-l{white-space:pre;overflow:hidden}.sk-b{font-weight:700}.sk-2{font-size:2em;line-height:1.15;font-weight:700}.sk-h{transform:scaleY(2);transform-origin:top;margin-bottom:1.3em}
        .sk-inv{background:#000;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sk-img{text-align:center;margin:1mm 0}.sk-img img{max-width:100%}
        .sk-cut{border-top:1px dashed #000;margin:3mm 0;height:0;page-break-after:always}.sk-cut span{display:none}.lembar+.lembar{page-break-before:always}
      </style></head><body>${Array.from({ length: salinan || 1 }, () => '<div class="lembar">' + satu + '</div>').join('')}</body></html>`);
      doc.close();
      const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { } setTimeout(() => f.remove(), 60000); };
      const imgs = Array.from(doc.images); if (!imgs.length) setTimeout(go, 150); else Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(go, 100));
    },
    BT: {
      _dev: null, _ch: null,
      SERVIS: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455', '0000ff00-0000-1000-8000-00805f9b34fb', '0000fee7-0000-1000-8000-00805f9b34fb', '0000ae30-0000-1000-8000-00805f9b34fb'],
      didukung() { return !!(navigator.bluetooth && window.isSecureContext); },
      terhubung() { return !!(this._dev && this._dev.gatt && this._dev.gatt.connected && this._ch); },
      nama() { return this._dev ? this._dev.name || 'Printer Bluetooth' : ''; },
      async hubungkan() {
        if (!this.didukung()) throw new Error('Web Bluetooth tidak didukung di browser/perangkat ini (gunakan Chrome Android/desktop via HTTPS, atau RawBT).');
        const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: this.SERVIS });
        dev.addEventListener('gattserverdisconnected', () => { this._ch = null; if (onPutus) onPutus(); });
        const srv = await dev.gatt.connect();
        let ch = null;
        for (const s of await srv.getPrimaryServices()) {
          for (const c of await s.getCharacteristics()) { if (c.properties.writeWithoutResponse || c.properties.write) { ch = c; break; } }
          if (ch) break;
        }
        if (!ch) throw new Error('Karakteristik tulis printer tidak ditemukan. Coba RawBT.');
        this._dev = dev; this._ch = ch;
        return dev.name || 'Printer';
      },
      async kirim(bytes) {
        if (!this.terhubung()) await this.hubungkan();
        const ch = this._ch;
        for (let i = 0; i < bytes.length; i += 180) {
          const part = bytes.slice(i, i + 180);
          if (ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse) await ch.writeValueWithoutResponse(part); else await ch.writeValue(part);
          await new Promise((r) => setTimeout(r, 18));
        }
      }
    },
    rawbt(bytes) {
      let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const url = 'intent:base64,' + btoa(bin) + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
      if (!/android/i.test(navigator.userAgent)) throw new Error('RawBT hanya untuk HP/tablet Android.');
      window.location.href = url;
    },
    async tes(st) {
      st = Object.assign(P.pengaturan(), st || {});
      const k = Number(st.lebar) === 80 ? 48 : 32;
      const isi = ['[C][B]TES PRINTER', '[C]SIMRS Mini', '[=]', '[LR]Lebar kertas||' + st.lebar + ' mm', '[LR]Kolom||' + k, '[LR]Metode||' + st.metode, '[-]', '[L]' + '1234567890'.repeat(Math.ceil(k / 10)).slice(0, k), '[C][2]A-001', '[BOX]BLOK SOROT', '[BAR]0123456789', '[QR]https://contoh.klinik/tes', '[C]Bila semua baris rapi, printer siap.', '[FEED]', '[CUT]'].join('\n');
      const h = Object.assign(StrukEngine.render(isi, {}, k, { qr: true }), { st });
      return P.cetak(h, st);
    },
    waMonospace(h, judul, link) { return (judul ? '*' + judul + '*\n' : '') + '```\n' + StrukEngine.teks(h) + '\n```' + (link ? '\n' + link : ''); },
    bukaWa(no, teks) {
      let n = String(no || '').replace(/\D/g, ''); if (n.indexOf('0') === 0) n = '62' + n.slice(1); else if (n && n.indexOf('62') !== 0 && n.charAt(0) === '8') n = '62' + n;
      window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(teks || ''), '_blank', 'noopener');
    },
    urlVerifikasi(id, kode) { return (APP_URL || (location.origin + location.pathname.replace(/[^/]*$/, ''))) + 'pantau.html#/v/' + encodeURIComponent(id) + '-' + encodeURIComponent(kode); }
  };
  window.StrukPrinter = P;
})();
