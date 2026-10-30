/* ==========================================================================
   StrukUI v1.0 (SIMRS Mini) — antarmuka modul struk & tiket thermal:
   • pratinjau(o)  : modal pratinjau 1:1 + cetak (Browser/Bluetooth/RawBT), PNG, WA, salin
   • editor(el, o) : Admin menyunting model (direktif & penanda), pratinjau langsung, riwayat versi
   • pengaturan(el, o): printer bawaan klinik (server) + pilihan perangkat ini (lokal)
   Bergantung pada StrukEngine, StrukPrinter, dan (bila ada) window.S.UI untuk modal.
   ========================================================================== */
(function () {
  'use strict';
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, c) => `<span class="ms ${c || ''}" aria-hidden="true">${n}</span>`;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ------------------------------------------------------------- gaya kertas */
  function gaya() {
    if (document.getElementById('struk-ui-css')) return;
    const st = document.createElement('style'); st.id = 'struk-ui-css';
    st.textContent = `
.st-stage{background:repeating-linear-gradient(45deg,#EEF0F2 0 10px,#E9EBEE 10px 20px);border-radius:12px;padding:18px 10px 22px;display:flex;justify-content:center;align-items:flex-start;overflow:auto;max-height:64vh;min-height:220px}
.st-stage .paper{--fs:clamp(8.5px,calc((100vw - 64px) / (var(--kolom) * .6 + 2.4)),12.5px);font-size:var(--fs);background:#fff;color:#111;font-family:"Courier New",ui-monospace,Menlo,monospace;line-height:1.32;width:calc(var(--kolom) * 1ch + 2.4ch);padding:1.1em 1.2ch 1.6em;box-shadow:0 2px 10px rgba(0,0,0,.12);position:relative;flex-shrink:0}
.st-stage .paper::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:8px;background:linear-gradient(-45deg,transparent 6px,#fff 0) 0 0/12px 8px repeat-x,linear-gradient(45deg,transparent 6px,#fff 0) 0 0/12px 8px repeat-x}
.st-stage .sk-l{white-space:pre;overflow:hidden;min-height:1.32em}
.st-stage .sk-b{font-weight:700}.st-stage .sk-2{font-size:2em;line-height:1.15;font-weight:700}
.st-stage .sk-h{transform:scaleY(2);transform-origin:top;margin-bottom:1.32em}
.st-stage .sk-inv{background:#111;color:#fff;font-weight:700}
.st-stage .sk-img{text-align:center;margin:.35em 0}.st-stage .sk-img img{max-width:100%;display:inline-block}
.st-stage .sk-cut{border-top:1px dashed #9CA3AF;margin:.8em -1.2ch .4em;height:0;position:relative}
.st-stage .sk-cut span{position:absolute;right:4px;top:-.75em;background:#fff;color:#9CA3AF;font:10px/1 system-ui,sans-serif;padding:0 4px}
.st-pv{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:1.25rem;align-items:start}
.st-ctl{display:flex;flex-direction:column;gap:.85rem}
.st-ctl .seg{width:100%}.st-ctl .seg button{flex:1;justify-content:center;padding:8px 10px;font-size:13px}
.st-cek{display:flex;align-items:center;gap:.5rem;font-size:13px;cursor:pointer;user-select:none}
.st-cek input{width:18px;height:18px;accent-color:var(--primary,#1F6F6B)}
.st-meta{display:flex;gap:.4rem;flex-wrap:wrap}
.st-btns{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.st-btns .btn{width:100%}.st-btns .full{grid-column:1/-1}
.st-ed-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:1rem;align-items:start}
.st-code{font-family:ui-monospace,"Cascadia Mono",Menlo,Consolas,monospace!important;font-size:12.5px!important;line-height:1.5!important;min-height:420px;white-space:pre;tab-size:2;background:#FBFBFC!important;border-color:var(--line,#E5E7EB)!important}
.st-chips{display:flex;flex-wrap:wrap;gap:.3rem;max-height:150px;overflow:auto;padding:2px}
.st-chip{border:1px solid var(--line,#E5E7EB);background:#fff;border-radius:6px;padding:3px 7px;font:600 11px/1.3 ui-monospace,Menlo,monospace;color:var(--ink-2,#3F4948);cursor:pointer}
.st-chip:hover{border-color:var(--primary,#1F6F6B);color:var(--primary,#1F6F6B);background:var(--primary-soft,#E7F3F2)}
.st-list{display:grid;gap:.5rem}
.st-item{display:flex;align-items:center;gap:.75rem;padding:.7rem .85rem;border:1px solid var(--line,#E5E7EB);border-radius:12px;background:#fff;flex-wrap:wrap}
.st-item .nm{font-weight:700}.st-item .acts{margin-left:auto;display:flex;gap:.35rem;flex-wrap:wrap}
.st-item.off{opacity:.6}
.st-rw{display:grid;gap:.35rem;max-height:220px;overflow:auto}
.st-rw div{display:flex;align-items:center;gap:.5rem;font-size:12px;padding:.4rem .5rem;border-radius:8px;background:var(--bg,#F6F7F9)}
.st-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}
.st-pr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem 1rem}
@media (max-width:899px){.st-pv{grid-template-columns:1fr}.st-ed-grid{grid-template-columns:1fr}.st-form{grid-template-columns:1fr 1fr}.st-pr{grid-template-columns:1fr 1fr}.st-code{min-height:300px}}
@media (max-width:520px){.st-pr{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------- kamus & contoh */
  const DIREKTIF = [
    ['[C]', 'Rata tengah'], ['[R]', 'Rata kanan'], ['[L]', 'Rata kiri'], ['[B]', 'Tebal'], ['[2]', 'Huruf 2× (lebar+tinggi)'], ['[H]', 'Huruf tinggi 2×'],
    ['[LR]', 'Kiri||Kanan (dua sisi)'], ['[-]', 'Garis tipis'], ['[=]', 'Garis tebal'], ['[BOX]', 'Blok sorot hitam'],
    ['[QR]', 'Kode QR (isi atau URL_VERIFIKASI)'], ['[BAR]', 'Barcode Code128'], ['[LOGO]', 'Logo klinik'], ['[FEED]', 'Baris kosong'], ['[CUT]', 'Potong kertas']
  ];
  const PENGUBAH = [['rp', 'Rp 12.500'], ['angka', '12.500'], ['tgl', '29 Okt 2026'], ['kapital', 'HURUF BESAR'], ['judul', 'Huruf Judul'], ['kosong0', '0 dianggap kosong'], ['terbilang:rupiah', 'dua belas ribu rupiah'], ['potong:20', 'potong panjang'], ['bawaan:-', 'nilai bila kosong'], ['awal:Telp ', 'awalan'], ['akhir: menit', 'akhiran']];
  const UMUM = [['TOKO_NAMA', 'Nama klinik'], ['TOKO_ALAMAT', 'Alamat klinik'], ['TOKO_WA', 'Telepon klinik'], ['TANGGAL', 'Tanggal (yyyy-mm-dd)'], ['JAM', 'Jam'], ['NO_RM', 'Nomor rekam medis'], ['POLI', 'Nama poli'], ['PENJAMIN', 'Umum/BPJS/Asuransi'], ['PESAN_KAKI', 'Pesan kaki (Pengaturan Klinik)'], ['HEADER_LENGKAP', 'Terisi bila header lengkap'], ['HEADER_RINGKAS', 'Terisi bila header ringkas']];
  const KAMUS = {
    ANTREAN: UMUM.concat([['NO_ANTREAN', 'Nomor antrean, mis. A-012'], ['RUANG', 'Ruang poli'], ['DOKTER', 'Dokter jaga'], ['PASIEN', 'Nama pasien'], ['SISA', 'Antrean di depan'], ['ESTIMASI', 'Perkiraan menit'], ['PRIORITAS', 'Prioritas/Darurat (kosong bila normal)'], ['URL_PANTAU', 'Tautan pantau antrean']]),
    STRUK: UMUM.concat([['NOTA', 'No. kwitansi'], ['KASIR', 'Nama kasir'], ['PELANGGAN', 'Nama pasien'], ['#ITEM', 'Awal perulangan item'], ['ITEM.NAMA', 'Nama item'], ['ITEM.QTY', 'Jumlah'], ['ITEM.SATUAN', 'Satuan'], ['ITEM.HARGA', 'Harga satuan'], ['ITEM.SUB', 'Subtotal item'], ['/ITEM', 'Akhir perulangan'], ['JUMLAH_ITEM', 'Banyak item'], ['SUBTOTAL', 'Total biaya'], ['DISKON', 'Diskon'], ['DITANGGUNG', 'Ditanggung BPJS/asuransi'], ['TOTAL', 'Dibayar pasien'], ['METODE', 'Metode bayar'], ['DITERIMA', 'Uang diterima'], ['KEMBALI', 'Kembalian'], ['LUNAS', 'Terisi bila lunas'], ['STATUS', 'LUNAS (TUNAI) …'], ['HASH', 'Kode verifikasi'], ['URL_VERIFIKASI', 'Tautan cek keaslian']])
  };
  const tokoContoh = { TOKO_NAMA: 'Klinik Sehat Sentosa', TOKO_ALAMAT: 'Jl. Melati No. 12, Bandung', TOKO_WA: '022-7654321', PESAN_KAKI: 'Semoga lekas sembuh' };
  const CONTOH = {
    ANTREAN: Object.assign({}, tokoContoh, { NO_ANTREAN: 'A-012', POLI: 'Poli Umum', RUANG: 'Ruang 1', DOKTER: 'dr. Rina Puspita', TANGGAL: '2026-10-29', JAM: '08:41', NO_RM: 'RM-2026-00042', PASIEN: 'Budi Santoso', PENJAMIN: 'BPJS Kesehatan', SISA: 4, ESTIMASI: 40, PRIORITAS: '', URL_PANTAU: 'https://klinik.contoh/pantau.html?t=A-012' }),
    STRUK: Object.assign({}, tokoContoh, {
      NOTA: 'INV-20261029-0007', TANGGAL: '2026-10-29', JAM: '10:15', KASIR: 'Sari', PELANGGAN: 'Budi Santoso', NO_RM: 'RM-2026-00042', POLI: 'Poli Umum', PENJAMIN: 'Umum',
      ITEM: [{ NAMA: 'Biaya Administrasi', QTY: 1, SATUAN: 'x', HARGA: 10000, SUB: 10000 }, { NAMA: 'Konsultasi Dokter Umum', QTY: 1, SATUAN: 'x', HARGA: 50000, SUB: 50000 }, { NAMA: 'Paracetamol 500 mg', QTY: 10, SATUAN: 'tab', HARGA: 500, SUB: 5000 }],
      JUMLAH_ITEM: 3, SUBTOTAL: 65000, DISKON: 0, DITANGGUNG: 0, TOTAL: 65000, METODE: 'Tunai', DITERIMA: 100000, KEMBALI: 35000, LUNAS: 'YA', STATUS: 'LUNAS (TUNAI)', HASH: 'V-K7P2QX9MLA', URL_VERIFIKASI: 'https://klinik.contoh/pantau.html#/v/INV-20261029-0007-K7P2QX9MLA'
    })
  };

  /* ------------------------------------------------------------- utilitas */
  const toastDari = (o) => (j, i, t) => { if (o && o.toast) o.toast(j, i, t); else if (window.S && S.UI) S.UI.toast(j, i, t); };
  function modal(o) {
    if (window.S && S.UI && S.UI.modal) return S.UI.modal(o);
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${o.lebar || ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${esc(o.judul)}</h3><button class="btn icon ghost sm" data-x aria-label="Tutup">${ik('close')}</button></div><div class="modal-b"></div></div>`;
    const body = $('.modal-b', bg); if (typeof o.isi === 'string') body.innerHTML = o.isi; else body.appendChild(o.isi);
    const tutup = () => { bg.remove(); if (o.onTutup) o.onTutup(); };
    $('[data-x]', bg).onclick = tutup; document.body.appendChild(bg);
    return { tutup, el: bg, body };
  }
  const seg = (nama, pilihan, nilai) => `<div class="seg" role="group" data-seg="${nama}">${pilihan.map(([v, l, dis]) => `<button type="button" data-v="${esc(v)}" class="${String(v) === String(nilai) ? 'on' : ''}" ${dis ? 'disabled title="' + esc(dis) + '"' : ''}>${l}</button>`).join('')}</div>`;
  const segVal = (box, nama) => { const b = $(`[data-seg="${nama}"] button.on`, box); return b ? b.dataset.v : ''; };
  function pasangSeg(box, cb) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg] button'); if (!b || b.disabled) return;
      const g = b.parentElement; $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); cb(g.dataset.seg, b.dataset.v);
    });
  }
  const METODE = () => {
    const bt = window.StrukPrinter && StrukPrinter.BT.didukung(), android = /android/i.test(navigator.userAgent);
    return [['browser', ik('print', 's18') + 'Dialog'], ['bt', ik('bluetooth', 's18') + 'Bluetooth', bt ? '' : 'Butuh Chrome + HTTPS dengan Bluetooth aktif'], ['rawbt', ik('android', 's18') + 'RawBT', android ? '' : 'Khusus HP/tablet Android dengan aplikasi RawBT']];
  };
  const unduh = (url, nama) => { const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100); };

  /* ================================================================= PRATINJAU */
  /** pratinjau({data, jenis, nomor, judul, opsi, waNomor, waLink, setelahSimpan, onBaru, onTutup, toast}) */
  function pratinjau(o) {
    gaya();
    const toast = toastDari(o), jenis = o.jenis || 'STRUK';
    const dasar = StrukPrinter.pengaturan(o.opsi || {});
    const sesaat = { lebar: dasar.lebar, metode: dasar.metode, qr: dasar.qr, header: dasar.header, rangkap: dasar.rangkap };
    if (sesaat.metode === 'bt' && !StrukPrinter.BT.didukung()) sesaat.metode = 'browser';
    if (sesaat.metode === 'rawbt' && !/android/i.test(navigator.userAgent)) sesaat.metode = 'browser';
    let kode = '', h = null;
    const wrap = document.createElement('div');
    wrap.innerHTML = `${o.setelahSimpan ? `<div class="note ok" style="margin-bottom:1rem">${ik('check_circle', 's18')}<span>Data tersimpan. ${jenis === 'ANTREAN' ? 'Tiket antrean' : 'Kwitansi'} siap dicetak.</span></div>` : ''}
      <div class="st-pv">
        <div><div class="st-stage" data-stage aria-label="Pratinjau cetak"></div><div class="st-meta" style="margin-top:.6rem" data-meta></div></div>
        <div class="st-ctl">
          <div class="field"><label>Lebar kertas</label>${seg('lebar', [[58, '58 mm'], [80, '80 mm']], sesaat.lebar)}</div>
          <div class="field"><label>Model</label><select class="sel white" data-model></select></div>
          <div class="field"><label>Cara cetak</label>${seg('metode', METODE(), sesaat.metode)}<span class="hint" data-bt></span></div>
          <div class="row wrap" style="gap:.4rem 1rem">
            <label class="st-cek"><input type="checkbox" data-qr ${sesaat.qr ? 'checked' : ''}> QR</label>
            <label class="st-cek"><input type="checkbox" data-head ${sesaat.header === 'lengkap' ? 'checked' : ''}> Alamat klinik</label>
            <label class="st-cek">Rangkap <select class="sel white" data-rangkap style="height:32px;width:64px;padding:0 24px 0 10px">${[1, 2, 3].map((n) => `<option ${n === Number(sesaat.rangkap) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          </div>
          <label class="st-cek"><input type="checkbox" data-ingat> Ingat pilihan ini di perangkat ini</label>
          <div class="st-btns">
            <button class="btn primary lg full" data-cetak>${ik('print')}Cetak</button>
            <button class="btn secondary" data-png>${ik('image', 's18')}PNG</button>
            <button class="btn secondary" data-wa>${ik('chat', 's18')}WhatsApp</button>
            <button class="btn ghost full" data-salin>${ik('content_copy', 's18')}Salin teks</button>
            ${o.onBaru ? `<button class="btn soft full" data-baru>${ik('person_add', 's18')}Daftarkan pasien berikutnya</button>` : ''}
          </div>
        </div>
      </div>`;
    const m = modal({ judul: o.judul || 'Pratinjau cetak', lebar: 'wide', isi: wrap, onTutup: o.onTutup, tanpaFokus: true });
    const stage = $('[data-stage]', wrap), meta = $('[data-meta]', wrap), selModel = $('[data-model]', wrap), btInfo = $('[data-bt]', wrap);

    function isiModel() {
      const daftar = StrukPrinter.daftar(jenis), st = StrukPrinter.pengaturan(sesaat);
      kode = StrukPrinter.pilihKode(st, jenis);
      if (!daftar.some((t) => t.kode === kode)) { const cocok = daftar.find((t) => (Number(sesaat.lebar) === 80) === (Number(t.lebar) >= 40)); kode = cocok ? cocok.kode : (daftar[0] ? daftar[0].kode : ''); }
      selModel.innerHTML = daftar.length ? daftar.map((t) => `<option value="${esc(t.kode)}" ${t.kode === kode ? 'selected' : ''}>${esc(t.nama)} · ${t.lebar} kol</option>`).join('') : '<option value="">Model cadangan</option>';
    }
    function gambar() {
      try { h = StrukPrinter.siapkan(o.data, { jenis, kode, opsi: sesaat }); } catch (e) { stage.innerHTML = `<div class="note danger">${esc(e.message)}</div>`; return; }
      stage.innerHTML = StrukEngine.html(h);
      meta.innerHTML = `<span class="badge">${h.kolom} kolom</span><span class="badge">± ${String(StrukEngine.panjangCm(h)).replace('.', ',')} cm</span><span class="badge teal">${esc(h.tpl.nama || h.tpl.kode)}</span>`;
      const bt = StrukPrinter.BT;
      btInfo.innerHTML = sesaat.metode === 'bt' ? (bt.terhubung() ? `Terhubung: <b>${esc(bt.nama())}</b>` : 'Belum terhubung — akan diminta memilih printer saat mencetak.') : sesaat.metode === 'rawbt' ? 'Pastikan aplikasi RawBT terpasang & printer sudah dipasangkan.' : 'Di dialog cetak: pilih printer thermal, ukuran kertas 58/80 mm, margin "None".';
    }
    pasangSeg(wrap, (nama, v) => {
      if (nama === 'lebar') { sesaat.lebar = Number(v); isiModel(); }
      if (nama === 'metode') sesaat.metode = v;
      gambar();
    });
    selModel.onchange = () => { kode = selModel.value; gambar(); };
    $('[data-qr]', wrap).onchange = (e) => { sesaat.qr = e.target.checked; gambar(); };
    $('[data-head]', wrap).onchange = (e) => { sesaat.header = e.target.checked ? 'lengkap' : 'ringkas'; gambar(); };
    $('[data-rangkap]', wrap).onchange = (e) => { sesaat.rangkap = Number(e.target.value) || 1; };
    const sibuk = async (btn, fn) => { if (btn.disabled) return; const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Memproses…'; try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; } };
    $('[data-cetak]', wrap).onclick = (e) => sibuk(e.currentTarget, async () => {
      if ($('[data-ingat]', wrap).checked) { const simpan = Object.assign({}, sesaat); simpan[jenis.toLowerCase() + (Number(sesaat.lebar) === 80 ? '80' : '58')] = kode; StrukPrinter.simpanLokal(simpan); }
      const r = await StrukPrinter.cetak(h, StrukPrinter.pengaturan(sesaat));
      if (r.cadangan) toast('Beralih ke dialog cetak', r.cadangan, 'warn');
      else toast(r.cara === 'bt' ? 'Terkirim ke printer Bluetooth' : r.cara === 'rawbt' ? 'Dikirim ke RawBT' : 'Dialog cetak dibuka', r.cara === 'browser' ? 'Pilih printer thermal & margin None.' : '');
      gambar();
    });
    $('[data-png]', wrap).onclick = (e) => sibuk(e.currentTarget, async () => { const url = await StrukEngine.png(h); unduh(url, String(o.nomor || jenis).replace(/[^\w-]+/g, '_') + '.png'); });
    $('[data-wa]', wrap).onclick = () => {
      const link = o.waLink || (o.data && (o.data.URL_VERIFIKASI || o.data.URL_PANTAU)) || '';
      StrukPrinter.bukaWa(o.waNomor || '', o.wa || StrukPrinter.waMonospace(h, o.judul || '', link));
    };
    $('[data-salin]', wrap).onclick = async () => { try { await navigator.clipboard.writeText(StrukEngine.teks(h)); toast('Teks disalin', 'Tempel di WhatsApp/catatan.'); } catch (e) { toast('Gagal menyalin', 'Browser menolak akses papan klip.', 'err'); } };
    if (o.onBaru) $('[data-baru]', wrap).onclick = () => { m.tutup(); o.onBaru(); };
    isiModel(); gambar();
    setTimeout(() => { const b = $('[data-cetak]', wrap); if (b) b.focus(); }, 40);
    return { tutup: m.tutup, gambar };
  }

  /* ================================================================= EDITOR MODEL */
  /** editor(el, {aksi(nama,data)→Promise<{success,data,message}>, segarkan, toast, konfirmasi}) */
  function editor(el, o) {
    gaya();
    const toast = toastDari(o), aksi = o.aksi, konfirmasi = o.konfirmasi || ((t) => Promise.resolve(window.confirm(t)));
    let daftar = [], cur = null, kotor = false;
    el.innerHTML = `<div class="stack" data-root>
      <div class="row between wrap"><p class="t-sm muted" style="max-width:640px">Model menentukan isi tiket antrean & kwitansi. Pratinjau memakai data contoh. Setiap simpan membuat versi baru (10 versi terakhir bisa dipulihkan).</p>
        <div class="row wrap"><button class="btn soft sm" data-baru="ANTREAN">${ik('add', 's18')}Model tiket</button><button class="btn soft sm" data-baru="STRUK">${ik('add', 's18')}Model kwitansi</button></div></div>
      <div class="st-list" data-list><div class="skel" style="height:56px"></div></div>
      <div data-form hidden></div></div>`;
    const listEl = $('[data-list]', el), formEl = $('[data-form]', el);

    async function muat() {
      const r = await aksi('struk.semua');
      if (!r.success) { listEl.innerHTML = `<div class="note danger">${esc(r.message)}</div>`; return; }
      daftar = r.data || [];
      listEl.innerHTML = daftar.map((t) => `<div class="st-item ${t.aktif ? '' : 'off'}">
        <div class="col"><span class="nm">${esc(t.nama)}</span><span class="t-xs muted mono">${esc(t.kode)} · ${t.lebar} kolom · versi ${t.versi}${t.oleh ? ' · ' + esc(t.oleh) : ''}</span></div>
        <span class="badge ${t.jenis === 'ANTREAN' ? 'info' : 'teal'}">${t.jenis === 'ANTREAN' ? 'Tiket antrean' : 'Kwitansi'}</span>${t.standar ? '<span class="badge">Bawaan</span>' : ''}${t.aktif ? '' : '<span class="badge warn">Nonaktif</span>'}
        <div class="acts"><button class="btn secondary sm" data-edit="${esc(t.kode)}">${ik('edit', 's18')}Sunting</button><button class="btn ghost sm" data-dup="${esc(t.kode)}" title="Duplikat">${ik('content_copy', 's18')}</button>
        ${t.standar ? `<button class="btn ghost sm" data-reset="${esc(t.kode)}" title="Kembalikan ke bawaan">${ik('restart_alt', 's18')}</button>` : `<button class="btn ghost sm" data-hapus="${esc(t.kode)}" title="Hapus">${ik('delete', 's18')}</button>`}</div></div>`).join('') || '<div class="note info">Belum ada model.</div>';
    }
    async function setelah(r) {
      toast(r.success ? r.message || 'Tersimpan' : 'Gagal', r.success ? '' : r.message, r.success ? '' : 'err');
      if (r.success) { if (o.segarkan) await o.segarkan(); await muat(); }
      return r.success;
    }
    function bukaForm(t, baru) {
      cur = Object.assign({ kode: '', nama: '', jenis: 'ANTREAN', lebar: 32, isi: '', aktif: true, standar: false, riwayat: [] }, t || {}); kotor = false;
      const jen = cur.jenis;
      formEl.hidden = false; listEl.hidden = true; $$('[data-baru]', el).forEach((b) => { b.hidden = true; });
      formEl.innerHTML = `<div class="stack">
        <div class="row between wrap"><h4 class="h-md">${baru ? 'Model baru' : 'Sunting ' + esc(cur.kode)}</h4><button class="btn ghost sm" data-kembali>${ik('arrow_back', 's18')}Kembali ke daftar</button></div>
        <div class="st-form">
          <div class="field"><label>Kode</label><input class="inp white mono" data-f="kode" value="${esc(cur.kode)}" ${baru ? '' : 'readonly'} placeholder="TIKET_KU" maxlength="30"></div>
          <div class="field"><label>Nama</label><input class="inp white" data-f="nama" value="${esc(cur.nama)}" maxlength="60"></div>
          <div class="field"><label>Jenis</label><select class="sel white" data-f="jenis" ${baru ? '' : 'disabled'}><option value="ANTREAN" ${jen === 'ANTREAN' ? 'selected' : ''}>Tiket antrean</option><option value="STRUK" ${jen === 'STRUK' ? 'selected' : ''}>Kwitansi</option></select></div>
          <div class="field"><label>Lebar (kolom) <span class="hint">58mm=32 · 80mm=48</span></label><select class="sel white" data-f="lebar">${[32, 42, 48].map((n) => `<option value="${n}" ${Number(cur.lebar) === n ? 'selected' : ''}>${n} kolom${n === 32 ? ' (58 mm)' : n === 48 ? ' (80 mm)' : ' (80 mm font B)'}</option>`).join('')}</select></div>
        </div>
        <label class="st-cek"><input type="checkbox" data-f="aktif" ${cur.aktif ? 'checked' : ''}> Aktif (bisa dipilih saat mencetak)</label>
        <div class="st-ed-grid">
          <div class="stack sm">
            <textarea class="ta st-code" data-f="isi" spellcheck="false" aria-label="Isi model">${esc(cur.isi)}</textarea>
            <div data-cek></div>
            <details open><summary class="lbl" style="cursor:pointer;margin-bottom:.4rem">Penanda data — klik untuk menyisipkan</summary><div class="st-chips" data-kamus></div></details>
            <details><summary class="lbl" style="cursor:pointer;margin-bottom:.4rem">Direktif baris & pengubah</summary><div class="st-chips" data-dir>${DIREKTIF.map(([d, k]) => `<button type="button" class="st-chip" data-sisip-awal="${esc(d)}" title="${esc(k)}">${esc(d)}</button>`).join('')}</div>
              <div class="st-chips" style="margin-top:.4rem">${PENGUBAH.map(([p, k]) => `<button type="button" class="st-chip" data-sisip-ubah="${esc(p)}" title="${esc(k)}">|${esc(p)}</button>`).join('')}</div>
              <p class="t-xs muted" style="margin-top:.5rem">Baris yang semua penandanya kosong otomatis disembunyikan. Blok bersyarat: <code>{{?KUNCI}}…{{/KUNCI}}</code>. Komentar: awali baris dengan <code>//</code>.</p></details>
          </div>
          <div class="stack sm">
            <div class="row between"><span class="lbl">Pratinjau (data contoh)</span><label class="st-cek t-xs"><input type="checkbox" data-pv-head checked> Header lengkap</label></div>
            <div class="st-stage" data-pv></div>
            ${!baru && (cur.riwayat || []).length ? `<div><div class="lbl" style="margin:.4rem 0">Riwayat versi</div><div class="st-rw">${cur.riwayat.map((v) => `<div><b>v${v.versi}</b><span class="muted grow trunc">${esc(String(v.waktu || '').slice(0, 16).replace('T', ' '))} · ${esc(v.oleh || '-')}</span><button class="btn ghost sm" data-lihat="${v.versi}">Lihat</button><button class="btn secondary sm" data-pulih="${v.versi}">Pulihkan</button></div>`).join('')}</div></div>` : ''}
          </div>
        </div>
        <div class="row end wrap"><button class="btn secondary" data-kembali>Batal</button><button class="btn primary" data-simpan>${ik('save', 's18')}Simpan model</button></div>
      </div>`;
      const ta = $('[data-f="isi"]', formEl), pv = $('[data-pv]', formEl), cek = $('[data-cek]', formEl);
      const isiKamus = () => { const j = $('[data-f="jenis"]', formEl).value; $('[data-kamus]', formEl).innerHTML = KAMUS[j].map(([k, d]) => `<button type="button" class="st-chip" data-sisip="${esc(k)}" title="${esc(d)}">${esc(k)}</button>`).join(''); };
      const segar = () => {
        const j = $('[data-f="jenis"]', formEl).value, kol = Number($('[data-f="lebar"]', formEl).value) || 32;
        const d = Object.assign({}, CONTOH[j], { HEADER_LENGKAP: $('[data-pv-head]', formEl).checked ? 'YA' : '', HEADER_RINGKAS: $('[data-pv-head]', formEl).checked ? '' : 'YA' });
        try { pv.innerHTML = StrukEngine.html(StrukEngine.render(ta.value, d, kol, { qr: true, barcode: true })); } catch (e) { pv.innerHTML = `<div class="note danger">${esc(e.message)}</div>`; }
        // pemeriksaan ringan: penanda tak dikenal & blok tak tertutup
        const kenal = new Set(KAMUS[j].map((x) => x[0].replace(/^[#/]/, '').toUpperCase()));
        const asing = new Set(), buka = {}, tutup = {};
        (ta.value.match(/\{\{[^}]+\}\}/g) || []).forEach((t) => {
          const m = t.match(/^\{\{\s*([#?/]?)\s*([\w.#]+)/); if (!m) return;
          const k = m[2].toUpperCase().replace(/#\d+/, '');
          if (m[1] === '#' || m[1] === '?') buka[k] = (buka[k] || 0) + 1; else if (m[1] === '/') tutup[k] = (tutup[k] || 0) + 1;
          if (!kenal.has(k) && !kenal.has(k.split('.')[0])) asing.add(k);
        });
        const tidakTutup = Object.keys(buka).filter((k) => buka[k] !== (tutup[k] || 0));
        const pesan = [];
        if (asing.size) pesan.push('Penanda tidak dikenal (akan kosong): ' + Array.from(asing).join(', '));
        if (tidakTutup.length) pesan.push('Blok belum ditutup: ' + tidakTutup.map((k) => '{{/' + k + '}}').join(', '));
        cek.innerHTML = pesan.length ? `<div class="note">${ik('warning', 's18')}<span>${esc(pesan.join(' · '))}</span></div>` : '';
      };
      let tmr = null; const tunda = () => { kotor = true; clearTimeout(tmr); tmr = setTimeout(segar, 160); };
      ta.addEventListener('input', tunda);
      ta.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('[data-simpan]', formEl).click(); }
        if (e.key === 'Tab') { e.preventDefault(); sisip('  '); }
      });
      $('[data-f="jenis"]', formEl).onchange = () => { isiKamus(); segar(); };
      $('[data-f="lebar"]', formEl).onchange = () => { kotor = true; segar(); };
      $('[data-pv-head]', formEl).onchange = segar;
      function sisip(teks, awalBaris) {
        const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
        if (awalBaris) { const ls = v.lastIndexOf('\n', a - 1) + 1; ta.value = v.slice(0, ls) + teks + v.slice(ls); ta.selectionStart = ta.selectionEnd = a + teks.length; }
        else { ta.value = v.slice(0, a) + teks + v.slice(b); ta.selectionStart = ta.selectionEnd = a + teks.length; }
        ta.focus(); tunda();
      }
      formEl.onclick = async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.sisip) { const k = b.dataset.sisip; sisip(k.charAt(0) === '#' ? '{{' + k + '}}\n\n{{/' + k.slice(1) + '}}' : k.charAt(0) === '/' ? '{{' + k + '}}' : '{{' + k + '}}'); }
        else if (b.dataset.sisipAwal) sisip(b.dataset.sisipAwal, true);
        else if (b.dataset.sisipUbah) { const a = ta.selectionStart, v = ta.value, tutupIdx = v.indexOf('}}', a), bukaIdx = v.lastIndexOf('{{', a); if (bukaIdx >= 0 && tutupIdx >= 0 && v.lastIndexOf('}}', a - 1) < bukaIdx) { ta.selectionStart = ta.selectionEnd = tutupIdx; } sisip('|' + b.dataset.sisipUbah); }
        else if (b.hasAttribute('data-kembali')) { if (kotor && !(await konfirmasi('Perubahan belum disimpan. Tinggalkan editor?'))) return; tutupForm(); }
        else if (b.dataset.lihat) { const v = (cur.riwayat || []).find((x) => String(x.versi) === b.dataset.lihat); if (v) { const kol = Number(v.lebar) || 32; pv.innerHTML = `<div class="col" style="align-items:center;gap:.5rem"><span class="badge warn">Versi ${v.versi} (hanya lihat)</span>${StrukEngine.html(StrukEngine.render(v.isi, Object.assign({ HEADER_LENGKAP: 'YA' }, CONTOH[cur.jenis]), kol, { qr: true }))}</div>`; } }
        else if (b.dataset.pulih) { if (!(await konfirmasi('Pulihkan versi ' + b.dataset.pulih + '? Isi sekarang disimpan ke riwayat.'))) return; const r = await aksi('struk.pulihkan', { kode: cur.kode, versi: Number(b.dataset.pulih) }); if (await setelah(r)) edit(cur.kode); }
        else if (b.hasAttribute('data-simpan')) {
          const data = { kode: $('[data-f="kode"]', formEl).value.trim().toUpperCase(), nama: $('[data-f="nama"]', formEl).value.trim(), jenis: $('[data-f="jenis"]', formEl).value, lebar: Number($('[data-f="lebar"]', formEl).value), isi: ta.value, aktif: $('[data-f="aktif"]', formEl).checked };
          if (!/^[A-Z0-9_]{3,30}$/.test(data.kode)) return toast('Kode tidak valid', '3–30 huruf besar, angka, atau garis bawah.', 'err');
          if (!data.isi.trim()) return toast('Isi model kosong', '', 'err');
          b.disabled = true; const r = await aksi('struk.simpan', data); b.disabled = false;
          if (await setelah(r)) { kotor = false; edit(data.kode); }
        }
      };
      isiKamus(); segar();
      ta.focus();
    }
    function tutupForm() { formEl.hidden = true; formEl.innerHTML = ''; listEl.hidden = false; $$('[data-baru]', el).forEach((b) => { b.hidden = false; }); cur = null; kotor = false; }
    async function edit(kode) {
      const r = await aksi('struk.detail', { kode });
      if (!r.success) return toast('Gagal memuat model', r.message, 'err');
      bukaForm(r.data, false);
    }
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b || formEl.contains(b)) return;
      if (b.dataset.baru) { const j = b.dataset.baru, contoh = daftar.find((t) => t.jenis === j && t.standar); let isi = ''; if (contoh) { const r = await aksi('struk.detail', { kode: contoh.kode }); if (r.success) isi = r.data.isi; } bukaForm({ jenis: j, nama: j === 'ANTREAN' ? 'Tiket antrean baru' : 'Kwitansi baru', lebar: 32, isi }, true); }
      if (b.dataset.edit) edit(b.dataset.edit);
      if (b.dataset.dup) { const kb = (window.prompt('Kode untuk salinan (huruf besar/angka/_):', b.dataset.dup + '_SALIN') || '').trim().toUpperCase(); if (!kb) return; await setelah(await aksi('struk.duplikat', { kode: b.dataset.dup, kodeBaru: kb })); }
      if (b.dataset.reset && await konfirmasi('Kembalikan model ' + b.dataset.reset + ' ke isi bawaan? Isi sekarang tetap tersimpan di riwayat.')) await setelah(await aksi('struk.reset', { kode: b.dataset.reset }));
      if (b.dataset.hapus && await konfirmasi('Hapus model ' + b.dataset.hapus + ' secara permanen?')) await setelah(await aksi('struk.hapus', { kode: b.dataset.hapus }));
    });
    muat();
    return { muat };
  }

  /* ================================================================= PENGATURAN PRINTER */
  /** pengaturan(el, {aksi, toast}) — default klinik (server) + perangkat ini (lokal). */
  function pengaturan(el, o) {
    gaya();
    const toast = toastDari(o), aksi = o.aksi;
    const opsiModel = (jenis, nilai) => StrukPrinter.daftar(jenis).map((t) => `<option value="${esc(t.kode)}" ${t.kode === nilai ? 'selected' : ''}>${esc(t.nama)} (${t.lebar} kol)</option>`).join('');
    function gambar() {
      const s = StrukPrinter.bawaanServer(), lok = StrukPrinter.lokal(), bt = StrukPrinter.BT;
      el.innerHTML = `<div class="stack">
        <div class="st-pr">
          <div class="field"><label>Lebar kertas</label>${seg('lebar', [[58, '58 mm'], [80, '80 mm']], s.lebar)}</div>
          <div class="field"><label>Cara cetak bawaan</label><select class="sel white" data-p="metode"><option value="browser" ${s.metode === 'browser' ? 'selected' : ''}>Dialog cetak browser</option><option value="bt" ${s.metode === 'bt' ? 'selected' : ''}>Bluetooth langsung (ESC/POS)</option><option value="rawbt" ${s.metode === 'rawbt' ? 'selected' : ''}>RawBT (Android)</option></select></div>
          <div class="field"><label>Rangkap</label><select class="sel white" data-p="rangkap">${[1, 2, 3].map((n) => `<option ${Number(s.rangkap) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>Model tiket 58 mm</label><select class="sel white" data-p="antrean58">${opsiModel('ANTREAN', s.antrean58)}</select></div>
          <div class="field"><label>Model tiket 80 mm</label><select class="sel white" data-p="antrean80">${opsiModel('ANTREAN', s.antrean80)}</select></div>
          <div class="field"><label>Header</label><select class="sel white" data-p="header"><option value="lengkap" ${s.header === 'lengkap' ? 'selected' : ''}>Lengkap (alamat & telepon)</option><option value="ringkas" ${s.header !== 'lengkap' ? 'selected' : ''}>Ringkas (nama saja)</option></select></div>
          <div class="field"><label>Model kwitansi 58 mm</label><select class="sel white" data-p="struk58">${opsiModel('STRUK', s.struk58)}</select></div>
          <div class="field"><label>Model kwitansi 80 mm</label><select class="sel white" data-p="struk80">${opsiModel('STRUK', s.struk80)}</select></div>
          <div class="field"><label>Kepekatan cetak (Bluetooth)</label><select class="sel white" data-p="density">${['Normal', 'Sedikit pekat', 'Pekat', 'Sangat pekat'].map((l, i) => `<option value="${i}" ${Number(s.density) === i ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="row wrap" style="gap:.5rem 1.25rem">
          <label class="st-cek"><input type="checkbox" data-p="qr" ${s.qr ? 'checked' : ''}> Cetak QR</label>
          <label class="st-cek"><input type="checkbox" data-p="logo" ${s.logo ? 'checked' : ''}> Cetak logo (bila model memakai [LOGO])</label>
          <label class="st-cek"><input type="checkbox" data-p="autoCut" ${s.autoCut ? 'checked' : ''}> Potong otomatis</label>
          <label class="st-cek"><input type="checkbox" data-p="beep" ${s.beep ? 'checked' : ''}> Bunyi selesai</label>
        </div>
        <div class="row end"><button class="btn primary" data-simpan-server>${ik('save', 's18')}Simpan sebagai bawaan klinik</button></div>
        <div class="card" style="background:var(--bg);box-shadow:none;border:0">
          <div class="row between wrap" style="margin-bottom:.6rem"><div><div class="sb">Perangkat ini</div><div class="t-xs muted">Pilihan di bawah hanya berlaku di browser ini dan mengalahkan bawaan klinik.</div></div>
            ${Object.keys(lok).length ? `<button class="btn ghost sm" data-reset-lokal>${ik('restart_alt', 's18')}Pakai bawaan klinik</button>` : '<span class="badge">Mengikuti bawaan klinik</span>'}</div>
          <div class="st-pr">
            <div class="field"><label>Lebar kertas</label>${seg('lebar-lokal', [[58, '58 mm'], [80, '80 mm']], lok.lebar || s.lebar)}</div>
            <div class="field"><label>Cara cetak</label>${seg('metode-lokal', METODE(), lok.metode || s.metode)}</div>
            <div class="field"><label>Printer Bluetooth</label><div class="row wrap"><button class="btn secondary sm" data-bt ${bt.didukung() ? '' : 'disabled'}>${ik('bluetooth_searching', 's18')}${bt.terhubung() ? 'Ganti printer' : 'Hubungkan'}</button><span class="t-xs ${bt.terhubung() ? 'green' : 'muted'}">${bt.terhubung() ? 'Terhubung: ' + esc(bt.nama()) : bt.didukung() ? 'Belum terhubung' : 'Tidak didukung di browser ini'}</span></div></div>
          </div>
          <div class="row wrap" style="margin-top:.85rem"><button class="btn soft" data-tes>${ik('receipt_long', 's18')}Cetak halaman uji</button><span class="t-xs muted">Uji memakai pengaturan perangkat ini.</span></div>
        </div>
        <div class="note info">${ik('info', 's18')}<span><b>Tips:</b> Bluetooth langsung butuh Chrome/Edge di Android/PC melalui HTTPS (GitHub Pages sudah HTTPS). Di HP Android tanpa Web Bluetooth, pasang aplikasi <b>RawBT</b>. Untuk dialog cetak, pilih ukuran kertas 58/80 mm dan margin <b>None</b>.</span></div>
      </div>`;
    }
    pasangSeg(el, (nama, v) => {
      if (nama === 'lebar-lokal') StrukPrinter.simpanLokal({ lebar: Number(v) });
      if (nama === 'metode-lokal') StrukPrinter.simpanLokal({ metode: v });
      if (nama.indexOf('lokal') > 0) gambar();
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-simpan-server')) {
        const p = { lebar: Number(segVal(el, 'lebar')) || 58 };
        $$('[data-p]', el).forEach((i) => { p[i.dataset.p] = i.type === 'checkbox' ? i.checked : (i.dataset.p === 'rangkap' || i.dataset.p === 'density' ? Number(i.value) : i.value); });
        b.disabled = true; const r = await aksi('printer.simpan', { printer: p }); b.disabled = false;
        toast(r.success ? 'Bawaan printer tersimpan' : 'Gagal menyimpan', r.success ? 'Berlaku untuk semua perangkat yang belum punya pilihan sendiri.' : r.message, r.success ? '' : 'err');
        if (r.success) { StrukPrinter.pasang({ server: r.data }); gambar(); }
      }
      if (b.hasAttribute('data-reset-lokal')) { StrukPrinter.resetLokal(); gambar(); toast('Perangkat ini kembali memakai bawaan klinik'); }
      if (b.hasAttribute('data-bt')) { try { const n = await StrukPrinter.BT.hubungkan(); StrukPrinter.simpanLokal({ metode: 'bt' }); toast('Printer terhubung', n); } catch (err) { if (err && err.name !== 'NotFoundError') toast('Gagal menghubungkan', err.message || String(err), 'err'); } gambar(); }
      if (b.hasAttribute('data-tes')) { b.disabled = true; try { const r = await StrukPrinter.tes(); toast(r.cadangan ? 'Beralih ke dialog cetak' : 'Halaman uji dikirim', r.cadangan || '', r.cadangan ? 'warn' : ''); } catch (err) { toast('Gagal mencetak', err.message, 'err'); } b.disabled = false; }
    });
    StrukPrinter.pasang({ onPutus: () => { if (document.body.contains(el)) gambar(); } });
    gambar();
    return { gambar };
  }

  window.StrukUI = { pratinjau, editor, pengaturan, KAMUS, CONTOH, DIREKTIF, PENGUBAH, gaya };
})();
