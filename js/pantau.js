/* ==========================================================================
   SIMRS Mini — pantau.js : halaman publik (tanpa login)
   • pantau.html?t=A-012  → posisi & perkiraan tunggu nomor antrean, status semua poli
   • pantau.html#/v/<ID>-<KODE> → cek keaslian kwitansi (QR di kwitansi)
   Hanya memakai rute publik 'antrean.publik' & 'verifikasi' (data tanpa nama pasien).
   ========================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, c) => `<span class="ms ${c || ''}" aria-hidden="true">${esc(n)}</span>`;
  const $ = (s, r) => (r || document).querySelector(s);
  const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const urlOk = () => !!CFG.GAS_URL && /^https?:\/\//.test(CFG.GAS_URL) && !/GANTI|XXXX/.test(CFG.GAS_URL);
  const root = document.getElementById('pt');
  let pollT = null, tiketNo = '', statusLama = '', ingat = false, actx = null;

  async function api(action, data) {
    if (!urlOk()) return { success: false, code: 'CONFIG', message: 'Aplikasi belum dikonfigurasi (GAS_URL kosong).' };
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
      const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: '', data: data || {} }), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(to); return await r.json();
    } catch (e) { return { success: false, code: 'NET', message: 'Tidak dapat terhubung. Periksa koneksi internet Anda.' }; }
  }
  const kepala = (nama, alamat) => `<header class="pt-head"><div class="logo-box">${ik('local_hospital', 'fill')}</div><div class="col"><h1>${esc(nama || 'Klinik')}</h1>${alamat ? `<span class="t-xs muted">${esc(alamat)}</span>` : ''}</div></header>`;

  /* ---------------------------------------------------------------- pantau antrean */
  function bunyi() {
    try { if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 600]); } catch (e) { }
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + .05;
      [783.99, 659.25, 523.25].forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; const t = t0 + i * .4; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 1.1); });
    } catch (e) { }
  }
  async function pantau(awal) {
    clearTimeout(pollT);
    if (awal) root.innerHTML = `${kepala('Memuat…')}<div class="card"><div class="skel" style="height:140px"></div></div><div class="skel" style="height:72px"></div><div class="skel" style="height:72px"></div>`;
    const r = await api('antrean.publik', tiketNo ? { no: tiketNo } : {});
    if (!r.success) {
      root.innerHTML = `${kepala('Pantau Antrean')}<div class="note danger">${ik('error', 's18')}<span>${esc(r.message)}</span></div><button class="btn primary" id="ulang">${ik('refresh', 's18')}Coba lagi</button>`;
      $('#ulang').onclick = () => pantau(true);
      pollT = setTimeout(() => pantau(false), 30000); return;
    }
    const d = r.data, t = d.tiket;
    document.title = 'Pantau Antrean — ' + (d.klinik || 'Klinik');
    let kartuTiket = '';
    if (tiketNo && !t) kartuTiket = `<div class="note">${ik('search_off', 's18')}<span>Nomor <b>${esc(tiketNo)}</b> tidak ditemukan di antrean hari ini. Periksa kembali nomor pada tiket Anda.</span></div>`;
    else if (t) {
      const dipanggil = t.status === 'Dipanggil' || (t.dipanggil_ke && ['FARMASI', 'KASIR'].indexOf(t.dipanggil_ke) >= 0 && t.status !== 'Selesai');
      const selesai = ['Selesai', 'Selesai Periksa', 'Batal'].indexOf(t.status) >= 0;
      const ket = t.status === 'Menunggu' ? (t.posisi <= 1 ? 'Anda berikutnya. Mohon bersiap di dekat ruang periksa.' : `Ada <b>${t.posisi - 1}</b> antrean di depan Anda.`) : t.status === 'Dipanggil' ? 'Nomor Anda sedang dipanggil — silakan menuju ' + esc(t.poli) + '.' : t.status === 'Diperiksa' ? 'Anda sedang dalam pemeriksaan.' : t.status === 'Selesai Periksa' ? 'Pemeriksaan selesai. Silakan menunggu panggilan farmasi/kasir.' : t.status === 'Batal' ? 'Antrean ini dibatalkan.' : 'Pelayanan selesai. Semoga lekas sembuh.';
      kartuTiket = `<div class="card tiket ${t.status === 'Dipanggil' ? 'dipanggil' : ''}">
        <div class="lbl up muted">Nomor antrean Anda</div><div class="no">${esc(t.no)}</div><div class="t-lg">${esc(t.poli)}</div>
        <div style="margin-top:.6rem">${t.status === 'Dipanggil' ? `<span class="badge lg dark">${ik('campaign', 's16')}DIPANGGIL</span>` : `<span class="badge lg ${selesai ? 'ok' : t.status === 'Diperiksa' ? 'teal' : 'warn'}">${esc(t.status)}</span>`}</div>
        <p class="t-sm" style="margin-top:.8rem">${ket}</p>
        ${t.status === 'Menunggu' ? `<div class="posisi"><div><span class="t-xs muted">Di depan Anda</span><b>${Math.max(0, t.posisi - 1)}</b></div><div><span class="t-xs muted">Perkiraan tunggu</span><b>± ${t.estimasi_menit}<small class="t-xs"> mnt</small></b></div></div>` : ''}
        ${!selesai ? `<button class="btn ${ingat ? 'soft' : 'secondary'} sm" id="ingat" style="margin-top:1rem">${ik(ingat ? 'notifications_active' : 'notifications', 's18')}${ingat ? 'Pengingat aktif (biarkan halaman terbuka)' : 'Getar & bunyi saat dipanggil'}</button>` : ''}
      </div>`;
      if (statusLama && statusLama !== t.status && dipanggil && ingat) bunyi();
      statusLama = t.status;
    }
    const kartu = (d.kartu || []).map((k) => {
      const saya = t && k.nomor === t.no;
      return `<div class="sp ${saya ? 'saya' : ''}"><div class="nob"><small>${k.jenis === 'FARMASI' ? 'Obat' : 'Dipanggil'}</small><b class="${k.nomor ? '' : 'kosong'}">${esc(k.nomor || '—')}</b></div>
        <div class="col grow"><span class="sb trunc">${esc(k.nama)}${k.ruang ? ` <span class="t-xs muted">• ${esc(k.ruang)}</span>` : ''}</span><span class="t-xs trunc ${k.nomor ? 'teal sb' : 'muted'}">${esc(k.status)}</span>${k.jenis === 'POLI' && k.dokter ? `<span class="t-xs muted trunc">${esc(k.dokter)}</span>` : ''}</div>
        ${k.jenis === 'POLI' ? `<div class="col" style="align-items:flex-end;gap:0;flex-shrink:0"><b class="mono" style="font-size:18px">${k.menunggu || 0}</b><span class="t-xs muted">menunggu</span></div>` : ''}</div>`;
    }).join('');
    root.innerHTML = `${kepala(d.klinik, d.alamat)}${kartuTiket}
      <form class="card pad-sm row" id="cari" autocomplete="off"><div class="inp-wrap grow">${ik('confirmation_number')}<input class="inp" name="no" placeholder="Nomor antrean, mis. A-012" value="${esc(tiketNo)}" aria-label="Nomor antrean" style="text-transform:uppercase"></div><button class="btn primary">Cek</button></form>
      <div class="row between"><h2 class="h-md">Status poli hari ini</h2><span class="t-xs muted">Diperbarui ${esc(String(d.waktu || '').slice(11, 16))}</span></div>
      <div class="stack sm">${kartu || '<div class="note info">Belum ada layanan aktif.</div>'}</div>
      <p class="foot">Halaman diperbarui otomatis tiap 20 detik. Nama pasien tidak ditampilkan demi privasi.<br><a href="#/v/">Cek keaslian kwitansi</a></p>`;
    $('#cari').onsubmit = (e) => { e.preventDefault(); const v = e.target.no.value.trim().toUpperCase().replace(/\s+/g, ''); tiketNo = /^[A-Z]+\d+$/.test(v) ? v.replace(/^([A-Z]+)(\d+)$/, '$1-$2') : v; statusLama = ''; const u = new URL(location.href); if (tiketNo) u.searchParams.set('t', tiketNo); else u.searchParams.delete('t'); history.replaceState(null, '', u.pathname + u.search); pantau(true); };
    const bi = $('#ingat'); if (bi) bi.onclick = () => { ingat = !ingat; if (ingat) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { } } pantau(false); };
    pollT = setTimeout(() => { if (!document.hidden) pantau(false); else pollT = setTimeout(() => pantau(false), 5000); }, 20000);
  }

  /* ---------------------------------------------------------------- verifikasi kwitansi */
  async function verifikasi(kode) {
    clearTimeout(pollT);
    const form = `<form class="card stack sm" id="fv" autocomplete="off"><label class="lbl" for="kv">Kode verifikasi pada kwitansi</label><input class="inp mono" id="kv" name="k" placeholder="INV-20261029-0007-K7P2QX9MLA" value="${esc(kode)}"><button class="btn primary">${ik('verified', 's18')}Periksa keaslian</button></form>`;
    if (!kode) {
      root.innerHTML = `${kepala('Cek Keaslian Kwitansi')}<p class="t-sm muted">Pindai QR pada kwitansi, atau ketik nomor kwitansi diikuti kode verifikasinya.</p>${form}<p class="foot"><a href="pantau.html">← Pantau antrean</a></p>`;
    } else {
      root.innerHTML = `${kepala('Cek Keaslian Kwitansi')}<div class="card"><div class="skel" style="height:180px"></div></div>`;
      const r = await api('verifikasi', { kode });
      const st = r.data && r.data.status, rg = (r.data && r.data.ringkasan) || null;
      const kelas = r.success && st === 'SAH' ? 'sah' : r.success && st === 'DIBATALKAN' ? 'batal' : 'tolak';
      const ikon = kelas === 'sah' ? 'verified' : kelas === 'batal' ? 'block' : 'gpp_bad';
      const judul = kelas === 'sah' ? 'Kwitansi ASLI' : st === 'DIBATALKAN' ? 'Kwitansi DIBATALKAN' : st === 'TIDAK COCOK' ? 'Data TIDAK COCOK' : 'Tidak dapat diverifikasi';
      root.innerHTML = `${kepala(rg && rg.klinik ? rg.klinik : 'Cek Keaslian Kwitansi')}
        <div class="card verif ${kelas}"><div class="ikon">${ik(ikon, 'fill')}</div><h2 class="h-lg">${judul}</h2><p class="t-sm muted" style="margin-top:.35rem">${esc(r.message)}</p>
        ${rg ? `<dl class="kv"><dt>No. kwitansi</dt><dd class="mono">${esc(rg.nomor)}</dd><dt>Tanggal bayar</dt><dd>${esc(rg.tanggal)}</dd><dt>Pasien</dt><dd>${esc(rg.pelanggan)}</dd><dt>Dibayar</dt><dd class="mono">${rp(rg.total)}</dd><dt>Metode</dt><dd>${esc(rg.metode)}</dd></dl>` : ''}</div>
        ${kelas === 'sah' ? '' : form}<p class="foot">Verifikasi mencocokkan sidik digital kwitansi dengan catatan kasir klinik.<br><a href="pantau.html">← Pantau antrean</a></p>`;
    }
    const f = $('#fv'); if (f) f.onsubmit = (e) => { e.preventDefault(); const v = e.target.k.value.trim().toUpperCase(); if (v) location.hash = '#/v/' + encodeURIComponent(v); };
  }

  /* ---------------------------------------------------------------- router */
  function rute() {
    const m = location.hash.match(/^#\/v\/?(.*)$/);
    if (m) return verifikasi(decodeURIComponent(m[1] || '').trim());
    tiketNo = (new URLSearchParams(location.search).get('t') || '').toUpperCase().slice(0, 12);
    pantau(true);
  }
  addEventListener('hashchange', rute);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !/^#\/v/.test(location.hash)) pantau(false); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rute); else rute();
})();
