/* ==========================================================================
   SIMRS Mini — app.js : login (Google + akses darurat), shell per peran,
   navigasi SPA, cari pasien global, notifikasi, profil, helper lintas modul.
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, Sesi, Store, api, swr, UI, Router, warmUp, muatSkrip, LS } = S;
  const App = window.App = { boot: null, halaman: {}, aktif: null, _poll: null };
  const VERSI_ASET = (S.CFG.VERSI || '1');

  const MENU = [
    { id: 'dashboard', label: 'Dashboard', ikon: 'grid_view', roles: ['ADMIN', 'PENDAFTARAN', 'DOKTER', 'FARMASI', 'KASIR', 'MANAJEMEN'] },
    { id: 'pendaftaran', label: 'Pendaftaran & Antrean', ikon: 'how_to_reg', roles: ['ADMIN', 'PENDAFTARAN'] },
    { id: 'rme', label: 'Pemeriksaan (RME)', ikon: 'clinical_notes', roles: ['ADMIN', 'DOKTER'] },
    { id: 'farmasi', label: 'Resep & Farmasi', ikon: 'prescriptions', roles: ['ADMIN', 'FARMASI'] },
    { id: 'kasir', label: 'Kasir / Billing', ikon: 'receipt_long', roles: ['ADMIN', 'KASIR'] },
    { id: 'laporan', label: 'Laporan & Manajemen', ikon: 'analytics', roles: ['ADMIN', 'MANAJEMEN'] },
    { id: 'kelola', label: 'Kelola Pengguna & Obat', ikon: 'manage_accounts', roles: ['ADMIN'] }
  ];
  const BERANDA = { ADMIN: 'dashboard', MANAJEMEN: 'dashboard', PENDAFTARAN: 'pendaftaran', DOKTER: 'rme', FARMASI: 'farmasi', KASIR: 'kasir' };
  App.peran = () => (Sesi.me ? Sesi.me.role : '');
  App.bisa = (id) => { const r = App.peran(), m = MENU.find((x) => x.id === id); return !!m && (r === 'ADMIN' || m.roles.indexOf(r) >= 0); };
  App.punya = (...roles) => roles.indexOf(App.peran()) >= 0 || App.peran() === 'ADMIN';
  App.setPoll = (fn, aktifMs, idleMs) => { App._poll = fn ? { fn, aktifMs: aktifMs || 15000, idleMs: idleMs || 60000, key: 'p' + Date.now() } : null; };
  setInterval(() => { const p = App._poll; if (p && !document.hidden && S.Activity.due(p.key, p.aktifMs, p.idleMs)) p.fn(); }, 3000);
  App.st = () => (App.boot && App.boot.pengaturan) || {};
  App.poli = () => ((App.boot && App.boot.poli) || []);
  App.poliMap = () => { const m = {}; App.poli().forEach((p) => { m[p.kode] = p; }); return m; };
  App.appUrl = () => { const u = App.st().APP_URL; return (u ? u.replace(/\/?$/, '/') : location.origin + location.pathname.replace(/[^/]*$/, '')); };

  /* ================================================================ LOGIN */
  const root = () => $('#root');
  async function tampilLogin(pesan) {
    App.setPoll(null);
    document.title = 'Masuk — SIMRS Mini';
    const cfgC = Store.get('authcfg'), darurat = /darurat/.test(location.hash);
    const klinik = (cfgC && cfgC.v && cfgC.v.klinik) || {};
    root().innerHTML = `
      <div class="login">
        <section class="login-art" aria-hidden="true">
          <div class="row gap-md"><div class="logo-box" style="background:rgba(255,255,255,.12)">${ik('local_hospital', 'fill s22')}</div><div><div class="b" style="font-size:18px">SIMRS Mini</div><div style="color:var(--on-primary-c);font-size:12px">Sistem Rawat Terpadu</div></div></div>
          <div style="max-width:440px;position:relative;z-index:1">
            <h1 class="h-xl" style="font-size:34px;line-height:42px">Alur pasien rapi dari loket sampai kasir.</h1>
            <p style="color:#d6f3f0;margin-top:.75rem">Pendaftaran, antrean bersuara, rekam medis elektronik, resep, farmasi, dan billing dalam satu sistem yang aman.</p>
            <div class="feat">${ik('campaign')}<div><b>Panggilan antrean bersuara</b><div style="color:#d6f3f0" class="t-sm">Layar TV ruang tunggu dengan suara perempuan/laki-laki.</div></div></div>
            <div class="feat">${ik('verified_user')}<div><b>Akses berbasis peran</b><div style="color:#d6f3f0" class="t-sm">Setiap akses rekam medis tercatat di log audit.</div></div></div>
            <div class="feat">${ik('print')}<div><b>Tiket & kwitansi thermal</b><div style="color:#d6f3f0" class="t-sm">58/80 mm via Bluetooth, RawBT, atau dialog cetak.</div></div></div>
          </div>
          <div class="t-xs" style="color:#bfe3df">v${esc(VERSI_ASET)}</div>
        </section>
        <section class="login-side">
          <div class="login-card stack">
            <div class="row gap-md"><div class="logo-box" id="lg-logo">${ik('local_hospital', 'fill s22')}</div><div><div class="h-md" id="lg-nama">${esc(klinik.nama || 'SIMRS Mini')}</div><div class="t-sm muted" id="lg-sub">${esc(klinik.subjudul || 'Sistem Informasi Manajemen Klinik')}</div></div></div>
            <div class="card stack">
              <div><h2 class="h-lg">${darurat ? 'Akses Darurat' : 'Masuk ke SIMRS'}</h2><p class="t-sm muted mt-sm">${darurat ? 'Khusus Admin bila login Google belum aktif atau bermasalah. Setiap pemakaian tercatat di log audit.' : 'Gunakan akun Google yang sudah didaftarkan Admin.'}</p></div>
              ${pesan ? `<div class="note danger">${ik('error', 's18')}<span>${esc(pesan)}</span></div>` : ''}
              <div id="lg-isi">${S.UI.skel(1)}</div>
            </div>
            <p class="t-xs muted ta-c">Data medis bersifat rahasia. Keluar dari aplikasi setelah selesai bertugas.</p>
          </div>
        </section>
      </div>`;
    if (!S.urlOk()) { $('#lg-isi').innerHTML = `<div class="note">${ik('settings', 's18')}<span>Aplikasi belum dikonfigurasi: isi <b>GAS_URL</b> di <code>js/config.js</code> dengan URL <code>/exec</code> Web App Apps Script, lalu muat ulang.</span></div>`; return; }
    warmUp('pub');
    if (darurat) return formDarurat();
    const r = await api('auth.config', {}, { tanpaToken: true });
    if (r.success) {
      Store.set('authcfg', r.data);
      if (r.data.klinik) { $('#lg-nama').textContent = r.data.klinik.nama || 'SIMRS Mini'; $('#lg-sub').textContent = r.data.klinik.subjudul || ''; if (r.data.klinik.logo) $('#lg-logo').innerHTML = `<img src="${esc(r.data.klinik.logo)}" alt="">`; }
    }
    const cid = r.success ? r.data.googleClientId : '';
    if (!cid) { $('#lg-isi').innerHTML = `<div class="note">${ik('info', 's18')}<span>${r.success ? 'Login Google belum diaktifkan. Admin: buka <b>…/index.html#/darurat</b>, masuk dengan Akses Darurat, lalu isi Client ID di <b>Kelola → Keamanan</b>.' : esc(r.message)}</span></div>`; return; }
    $('#lg-isi').innerHTML = `<div class="gbtn-wrap" id="gbtn"><button class="btn secondary lg w100" disabled><span class="spin"></span> Menyiapkan login Google…</button></div><div id="lg-status" class="t-sm muted ta-c"></div>`;
    try {
      await muatSkrip('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({ client_id: cid, callback: onGoogle, auto_select: false, ux_mode: 'popup', itp_support: true });
      $('#gbtn').innerHTML = '';
      google.accounts.id.renderButton($('#gbtn'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: Math.min(340, $('#gbtn').clientWidth || 320) });
    } catch (e) { $('#lg-isi').innerHTML = `<div class="note danger">${ik('error', 's18')}<span>Skrip login Google gagal dimuat. Periksa koneksi internet lalu muat ulang.</span></div>`; }
  }
  async function onGoogle(resp) {
    const st = $('#lg-status'); if (st) st.innerHTML = '<span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid var(--primary);border-right-color:transparent;border-radius:50%;animation:putar .7s linear infinite"></span> Memverifikasi akun…';
    const r = await api('auth.google', { credential: resp.credential }, { tanpaToken: true });
    if (!r.success) return tampilLogin(r.message);
    Sesi.simpan(r.data.token, r.data.me);
    location.hash = '#/';
    mulaiApp();
  }
  function formDarurat() {
    $('#lg-isi').innerHTML = `<form class="stack" id="f-darurat" autocomplete="off">
      <div class="field"><label for="du">Nama pengguna</label><input class="inp" id="du" required autocomplete="username"></div>
      <div class="field"><label for="dp">Kata sandi</label><input class="inp" id="dp" type="password" required autocomplete="current-password"></div>
      <button class="btn primary lg" type="submit">${ik('lock_open', 's18')} Masuk</button>
      <a href="#/" class="t-sm ta-c">Kembali ke login Google</a></form>`;
    $('#f-darurat').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target);
      await UI.sibuk(btn, async () => {
        const r = await api('auth.darurat', { username: $('#du').value.trim(), password: $('#dp').value }, { tanpaToken: true });
        $('#dp').value = '';
        if (!r.success) return UI.toast('Gagal masuk', r.message, 'err');
        Sesi.simpan(r.data.token, r.data.me); location.hash = '#/kelola/keamanan'; mulaiApp();
      });
    };
  }
  document.addEventListener('sesi-habis', (e) => tampilLogin(e.detail));

  /* ================================================================ SHELL */
  function shell() {
    const me = Sesi.me, st = App.st();
    document.title = (st.KLINIK_NAMA || 'SIMRS Mini') + ' — SIMRS Mini';
    const menu = MENU.filter((m) => App.bisa(m.id));
    root().innerHTML = `
      <div class="app">
        <aside class="side" id="side" aria-label="Navigasi utama">
          <div class="side-brand"><div class="logo-box">${st.LOGO_URL ? `<img src="${esc(st.LOGO_URL)}" alt="">` : ik('local_hospital', 'fill s22')}</div><div class="col" style="gap:0"><span class="brand-t">SIMRS Mini</span><span class="brand-s trunc" style="max-width:160px">${esc(st.KLINIK_NAMA || 'Sistem Rawat Terpadu')}</span></div></div>
          <nav class="nav" id="nav">${menu.map((m) => `<a href="#/${m.id}" data-id="${m.id}">${ik(m.ikon)}<span>${esc(m.label)}</span></a>`).join('')}</nav>
          ${App.punya('PENDAFTARAN', 'DOKTER') ? `<div class="side-help"><div class="row lbl-sm up" style="color:var(--amber)">${ik('tv', 's18')} Layar Panggilan</div><p>Buka di TV ruang tunggu. Suara panggilan berbunyi otomatis.</p><a class="btn accent sm w100" href="display.html" target="_blank" rel="noopener">${ik('open_in_new', 's16')} Buka Layar TV</a></div>` : ''}
          <div class="side-foot"><span class="ms teal s18">badge</span><div class="col grow" style="gap:0"><span class="lbl-sm trunc">${esc(me.nama)}</span><span class="t-xs muted">${esc(me.peranLabel || me.role)}</span></div><button class="btn icon ghost sm" id="btn-keluar" title="Keluar" aria-label="Keluar">${ik('logout')}</button></div>
        </aside>
        <div class="scrim" id="scrim"></div>
        <div class="main">
          <header class="top">
            <button class="btn icon ghost burger" id="burger" aria-label="Buka menu">${ik('menu')}</button>
            ${me.role !== 'MANAJEMEN' ? `<div class="top-search"><div class="inp-wrap">${ik('search')}<input class="inp" id="cari" type="search" placeholder="Cari Pasien (No. RM / NIK / Nama)…" autocomplete="off" aria-label="Cari pasien"></div><div class="search-pop" id="cari-pop" hidden></div></div>` : '<div class="grow"></div>'}
            <div class="row gap-sm" style="position:relative">
              <button class="btn icon ghost bell" id="bell" aria-label="Aktivitas terkini">${ik('notifications')}<span class="ndot" id="ndot" hidden></span></button>
              <span style="width:1px;height:28px;background:var(--line)"></span>
              <button class="prof-btn" id="prof"><span class="avatar">${me.foto ? `<img src="${esc(me.foto)}" alt="" referrerpolicy="no-referrer">` : esc(F.inisial(me.nama))}</span><span class="col prof-meta" style="gap:0"><span class="lbl" style="font-size:14px">${esc(me.nama)}</span><span class="t-xs muted">${esc(me.peranLabel || me.role)}${me.darurat ? ' • darurat' : ''}</span></span></button>
              <div class="menu-pop" id="prof-pop" hidden></div><div class="menu-pop" id="bell-pop" hidden style="width:340px"></div>
            </div>
          </header>
          <div class="offline-bar" id="offline" hidden>${ik('wifi_off', 's16')} Perangkat offline — data mungkin belum terbaru.</div>
          <main class="page" id="page" tabindex="-1"></main>
        </div>
      </div>`;
    const side = $('#side'), scrim = $('#scrim');
    $('#burger').onclick = () => { side.classList.add('open'); scrim.classList.add('on'); };
    scrim.onclick = () => { side.classList.remove('open'); scrim.classList.remove('on'); };
    $$('#nav a').forEach((a) => a.addEventListener('click', () => { side.classList.remove('open'); scrim.classList.remove('on'); }));
    $('#btn-keluar').onclick = keluar;
    $('#prof').onclick = (e) => { e.stopPropagation(); togglePop('#prof-pop', profilMenu); };
    $('#bell').onclick = (e) => { e.stopPropagation(); togglePop('#bell-pop', bellMenu); };
    document.addEventListener('click', (e) => { if (!e.target.closest('.menu-pop')) $$('.menu-pop').forEach((p) => { p.hidden = true; }); if (!e.target.closest('.top-search')) { const p = $('#cari-pop'); if (p) p.hidden = true; } });
    if ($('#cari')) pasangCari();
    addEventListener('online', () => { $('#offline').hidden = true; }); addEventListener('offline', () => { $('#offline').hidden = false; });
    $('#offline').hidden = navigator.onLine !== false;
  }
  function togglePop(sel, isi) { const p = $(sel), buka = p.hidden; $$('.menu-pop').forEach((x) => { x.hidden = true; }); if (buka) { isi(p); p.hidden = false; } }
  function profilMenu(p) {
    const me = Sesi.me;
    p.innerHTML = `<div style="padding:8px 10px"><div class="lbl" style="font-size:14px">${esc(me.nama)}</div><div class="t-xs muted">${esc(me.email)}</div><div class="mt-sm"><span class="badge teal">${esc(me.peranLabel || me.role)}</span></div></div><div class="hr" style="margin:4px 0"></div>
      ${App.punya('PENDAFTARAN', 'DOKTER', 'FARMASI', 'KASIR') ? `<button data-a="suara">${ik(LS.get('simrs.suaraLokal', false) ? 'volume_up' : 'volume_off', 's18')} Suara panggilan di perangkat ini: ${LS.get('simrs.suaraLokal', false) ? 'Aktif' : 'Mati'}</button>` : ''}
      <a href="display.html" target="_blank" rel="noopener">${ik('tv', 's18')} Buka Layar Panggilan TV</a>
      <a href="pantau.html" target="_blank" rel="noopener">${ik('smartphone', 's18')} Halaman Pantau Antrean (pasien)</a>
      <div class="hr" style="margin:4px 0"></div>
      <button data-a="semua">${ik('devices', 's18')} Keluar dari semua perangkat</button>
      <button data-a="keluar" style="color:var(--danger-text)">${ik('logout', 's18')} Keluar</button>`;
    p.onclick = async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'keluar') keluar();
      if (b.dataset.a === 'suara') { LS.set('simrs.suaraLokal', !LS.get('simrs.suaraLokal', false)); UI.toast('Suara panggilan lokal ' + (LS.get('simrs.suaraLokal', false) ? 'aktif' : 'dimatikan'), 'Berlaku untuk tombol Panggil di perangkat ini.'); p.hidden = true; }
      if (b.dataset.a === 'semua' && await UI.konfirmasi('Semua sesi akun ini di perangkat lain akan diakhiri. Lanjutkan?', { ok: 'Keluar dari semua' })) { await api('auth.keluarSemua'); Sesi.hapus(); tampilLogin('Anda telah keluar dari semua perangkat.'); }
    };
  }
  async function bellMenu(p) {
    p.innerHTML = `<div class="row between" style="padding:8px 10px"><b>Aktivitas Terkini</b><span class="t-xs muted">hari ini</span></div><div id="bell-isi">${UI.skel(3)}</div>`;
    const d = await swr('dash', 'dashboard', {}, null, { maxAge: 30000, phi: true });
    const akt = (d && d.aktivitas) || [];
    LS.set('simrs.bell', akt[0] ? akt[0].w : ''); $('#ndot').hidden = true;
    $('#bell-isi').innerHTML = akt.length ? '<div class="stack sm" style="padding:6px 10px 10px">' + akt.map((a) => `<div class="act"><div class="ai">${ik(a.ikon, 's16')}</div><div class="col" style="gap:0"><span class="lbl">${esc(a.judul)}</span><span class="t-xs muted">${esc(a.isi)}</span><span class="t-xs mono muted">${esc(F.relatif(a.w))}</span></div></div>`).join('') + '</div>' : UI.kosong('Belum ada aktivitas hari ini', 'notifications');
  }
  App.cekBell = (akt) => { const el = $('#ndot'); if (el && akt && akt[0] && akt[0].w !== LS.get('simrs.bell', '')) el.hidden = false; };
  async function keluar() {
    if (!(await UI.konfirmasi('Keluar dari SIMRS Mini?', { ok: 'Keluar' }))) return;
    api('auth.logout'); Sesi.hapus(); try { google.accounts.id.disableAutoSelect(); } catch (e) { }
    location.hash = '#/'; tampilLogin();
  }

  /* -------------------------------------------------------- cari pasien global */
  function pasangCari() {
    const inp = $('#cari'), pop = $('#cari-pop'); let hasil = [], pilih = -1;
    const render = () => {
      pop.hidden = false;
      pop.innerHTML = hasil.length ? hasil.map((p, i) => `<button data-i="${i}" class="${i === pilih ? 'on' : ''}"><span class="avatar">${esc(F.inisial(p.nama))}</span><span class="col grow" style="gap:0"><span class="sb trunc">${esc(p.nama)} ${p.alergi ? `<span class="badge danger" title="Alergi: ${esc(p.alergi)}">${ik('warning', 's16')} Alergi</span>` : ''}</span><span class="t-xs muted mono">${esc(p.id_rm)} • ${esc(p.umur)} • ${esc(F.jk(p.jk))} • ${esc(p.nik || 'tanpa NIK')}</span></span><span class="badge ${p.penjamin === 'BPJS' ? 'teal' : ''}">${esc(p.penjamin)}</span></button>`).join('') : `<div class="t-sm muted" style="padding:12px">Pasien tidak ditemukan.${App.punya('PENDAFTARAN') ? ' <a href="#/pendaftaran/baru">Daftarkan pasien baru</a>' : ''}</div>`;
    };
    const cari = S.debounce(async () => {
      const q = inp.value.trim(); if (q.length < 2) { pop.hidden = true; return; }
      pop.hidden = false; pop.innerHTML = '<div class="t-sm muted" style="padding:12px">Mencari…</div>';
      const r = await api('pasien.cari', { q }); if (q !== inp.value.trim()) return;
      hasil = r.success ? r.data : []; pilih = hasil.length ? 0 : -1; render();
    }, 280);
    inp.addEventListener('input', cari);
    inp.addEventListener('focus', () => { if (hasil.length && inp.value.trim().length >= 2) render(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { pilih = Math.min(hasil.length - 1, pilih + 1); render(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { pilih = Math.max(0, pilih - 1); render(); e.preventDefault(); }
      if (e.key === 'Enter' && hasil[pilih]) { buka(hasil[pilih]); }
      if (e.key === 'Escape') { pop.hidden = true; inp.blur(); }
    });
    pop.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) buka(hasil[+b.dataset.i]); });
    function buka(p) {
      pop.hidden = true; inp.value = '';
      if (App.punya('PENDAFTARAN')) return Router.go('/pendaftaran/baru?rm=' + encodeURIComponent(p.id_rm));
      if (App.punya('DOKTER')) return App.riwayatPasien(p.id_rm);
      UI.modal({ judul: 'Data Pasien', lebar: 'sm', isi: `<div class="kv"><div><span>Nama</span><span>${esc(p.nama)}</span></div><div><span>No. RM</span><span class="mono">${esc(p.id_rm)}</span></div><div><span>Umur / JK</span><span>${esc(p.umur)} • ${esc(F.jk(p.jk))}</span></div><div><span>Penjamin</span><span>${esc(p.penjamin)}</span></div><div><span>Alergi</span><span class="red">${esc(p.alergi || '-')}</span></div></div>`, aksi: [{ label: 'Tutup', kelas: 'primary' }] });
    }
  }

  /* -------------------------------------------------------- helper lintas modul */
  App.riwayatPasien = async (idRm) => {
    const m = UI.modal({ judul: 'Riwayat Rekam Medis', lebar: 'wide', isi: UI.skel(4), aksi: [{ label: 'Unduh PDF', ikon: 'picture_as_pdf', kelas: 'secondary', onClick: async (t, b) => { await UI.sibuk(b, async () => { const r = await api('rme.pdf', { id_rm: idRm }); if (r.success) S.Berkas.unduhBase64(r.data.base64, r.data.nama, r.data.mime); else UI.toast('Gagal', r.message, 'err'); }); return false; } }, { label: 'Tutup', kelas: 'primary' }] });
    const r = await api('rme.riwayat', { id_rm: idRm });
    if (!r.success) { m.body.innerHTML = `<div class="note danger">${esc(r.message)}</div>`; return; }
    const p = r.data.pasien;
    m.body.innerHTML = `<div class="row gap-md mb-md"><span class="avatar lg">${esc(F.inisial(p.nama))}</span><div class="col"><b class="t-lg">${esc(p.nama)}</b><span class="t-sm muted mono">${esc(p.id_rm)} • ${esc(F.jk(p.jk))} • ${esc(F.umur(p.tgl_lahir))} • ${esc(p.penjamin)}</span></div></div>
      ${p.alergi ? `<div class="alert-box mb-md"><b class="row lbl">${ik('emergency', 's18')} ALERGI</b><span class="t-sm">${esc(p.alergi)}</span></div>` : ''}
      ${App.riwayatHtml(r.data.riwayat)}`;
  };
  App.riwayatHtml = (rw) => rw.length ? '<div class="tl">' + rw.map((v, i) => `<div class="tl-i ${i === 0 ? 'baru' : ''}"><div class="row between"><span class="lbl ${i ? 'muted' : ''}">${esc(F.tgl(v.tanggal))}</span><span class="lbl-sm ${i ? 'muted' : 'teal'}">${esc(v.poli)}${v.dokter ? ' (' + esc(v.dokter) + ')' : ''}</span></div>
      <div class="panel t-sm stack sm" style="gap:.25rem">${v.diagnosis && v.diagnosis.length ? `<div class="row wrap gap-xs">${ik('stethoscope', 's16 muted')} <span>Diagnosis:</span> ${v.diagnosis.map((d) => `<b class="${d.utama ? 'teal' : ''}">${esc(d.nama || '')} (${esc(d.kode)})</b>`).join(', ')}</div>` : `<div class="muted">${esc(v.status)} — ${esc(v.keluhan || 'belum ada catatan')}</div>`}
      ${v.terapi && v.terapi.length ? `<div class="t-xs muted">Terapi: ${esc(v.terapi.join('; '))}</div>` : ''}${v.rujukan ? `<div class="t-xs amber-t">Rujukan: ${esc(v.rujukan)}</div>` : ''}</div></div>`).join('') + '</div>' : UI.kosong('Belum ada riwayat kunjungan', 'history');

  /** Panggil pasien (POLI/FARMASI/KASIR). Suara diputar di layar TV; opsional juga di perangkat ini. */
  App.panggil = async (idKunjungan, tujuan, btn) => {
    const jalan = async () => {
      const r = await api('antrean.panggil', { id_kunjungan: idKunjungan, tujuan: tujuan || 'POLI' });
      if (!r.success) { UI.toast('Gagal memanggil', r.message, 'err'); return null; }
      UI.toast(r.message, 'Layar TV akan membacakan panggilan.');
      if (LS.get('simrs.suaraLokal', false) && window.Suara) { const pg = r.data.panggilan; const st = App.st(); Suara.umumkan({ no: pg.no_antrean, nama_tujuan: pg.nama_tujuan, ruang: pg.ruang }, { gender: st.SUARA_GENDER, kecepatan: Number(st.SUARA_KECEPATAN) || 0.9, ulang: 1, chime: true }); }
      return r.data;
    };
    return btn ? UI.sibuk(btn, jalan) : jalan();
  };

  /* -------------------------------------------------------- modul cetak thermal (lazy) */
  let _struk = null;
  App.struk = async () => {
    if (!_struk) _struk = (async () => {
      await muatSkrip('https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js').catch(() => null);
      await muatSkrip('js/struk-engine.js?v=' + VERSI_ASET); await muatSkrip('js/struk-printer.js?v=' + VERSI_ASET); await muatSkrip('js/struk-ui.js?v=' + VERSI_ASET);
    })().catch((e) => { _struk = null; throw e; });
    await _struk;
    const b = App.boot || {}, st = App.st();
    StrukPrinter.pasang({ templates: (b.struk && b.struk.templates) || [], server: (b.struk && b.struk.printer) || {}, appUrl: App.appUrl(), logoUrl: st.LOGO_URL || '' });
    StrukEngine.atur({ rp: F.rp, angka: F.angka });
  };
  App.dataToko = () => { const st = App.st(); return { TOKO_NAMA: st.KLINIK_NAMA || 'Klinik', TOKO_ALAMAT: st.KLINIK_ALAMAT || '', TOKO_WA: st.KLINIK_TELEPON || '' }; };
  App.cetakTiket = async (k, tiket, opsi) => {
    try { await App.struk(); } catch (e) { return UI.toast('Modul cetak gagal dimuat', e.message, 'err'); }
    const st = App.st(), poli = App.poliMap()[k.poli] || {};
    const data = Object.assign(App.dataToko(), {
      NO_ANTREAN: k.no_antrean, POLI: poli.nama || (tiket && tiket.poli) || k.poli, RUANG: poli.ruang || '', DOKTER: (tiket && tiket.dokter) || k.dokter_nama || poli.dokter_nama || '',
      TANGGAL: k.tanggal || F.iso(), JAM: k.jam || F.jam(), NO_RM: k.id_rm, PASIEN: k.nama_pasien, PENJAMIN: k.penjamin === 'BPJS' ? 'BPJS Kesehatan' : k.penjamin,
      SISA: tiket ? tiket.sisa : Math.max(0, (k.posisi || 1) - 1), ESTIMASI: tiket ? tiket.estimasi_menit : '', PRIORITAS: k.prioritas && k.prioritas !== 'Normal' ? k.prioritas : '',
      URL_PANTAU: App.appUrl() + 'pantau.html?t=' + encodeURIComponent(k.no_antrean), PESAN_KAKI: st.TIKET_PESAN || ''
    });
    StrukUI.pratinjau(Object.assign({ jenis: 'ANTREAN', data, nomor: k.no_antrean, judul: 'Tiket Antrean ' + k.no_antrean, toast: (j, i, t) => UI.toast(j, i, t) }, opsi || {}));
  };
  App.cetakKwitansi = async (t, opsi) => {
    try { await App.struk(); } catch (e) { return UI.toast('Modul cetak gagal dimuat', e.message, 'err'); }
    const st = App.st(), wb = String(t.waktu_bayar || '');
    const data = Object.assign(App.dataToko(), {
      NOTA: t.id_tagihan, TANGGAL: wb.slice(0, 10) || F.iso(), JAM: wb.slice(11, 16), KASIR: t.kasir, PELANGGAN: t.nama_pasien, NO_RM: t.id_rm, POLI: t.poli, PENJAMIN: t.penjamin,
      ITEM: (t.rincian || []).map((x) => ({ NAMA: x.nama, QTY: x.qty, SATUAN: x.satuan || '', HARGA: x.harga, SUB: x.sub })), JUMLAH_ITEM: (t.rincian || []).length,
      SUBTOTAL: t.total, DISKON: t.diskon || 0, DITANGGUNG: t.ditanggung || 0, TOTAL: t.harus_bayar, METODE: t.metode, DITERIMA: t.dibayar || 0, KEMBALI: t.kembalian || 0,
      LUNAS: t.status_bayar === 'Lunas' ? 'YA' : '', STATUS: t.status_bayar === 'Lunas' ? 'LUNAS (' + String(t.metode || '').toUpperCase() + ')' : 'BELUM LUNAS',
      HASH: t.kode_verifikasi ? 'V-' + t.kode_verifikasi : '', URL_VERIFIKASI: t.kode_verifikasi ? StrukPrinter.urlVerifikasi(t.id_tagihan, t.kode_verifikasi) : '', PESAN_KAKI: st.KWITANSI_PESAN || ''
    });
    StrukUI.pratinjau(Object.assign({ jenis: 'STRUK', data, nomor: t.id_tagihan, judul: 'Kwitansi ' + t.id_tagihan, waNomor: (t.pasien && t.pasien.no_hp) || '', toast: (j, i, x) => UI.toast(j, i, x) }, opsi || {}));
  };

  /* ================================================================ BOOT & ROUTING */
  async function muatBoot(paksa) {
    return swr('boot', 'boot', {}, (d) => { App.boot = d; if (d && d.me) { const s = Sesi.data; s.me = Object.assign({}, s.me, d.me); Sesi.simpan(s.token, s.me); } }, { maxAge: 10 * 60 * 1000, paksa });
  }
  App.muatBoot = muatBoot;
  async function mulaiApp() {
    root().innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem"><div class="logo-box" style="width:52px;height:52px">${ik('local_hospital', 'fill s28')}</div><div class="t-sm muted">Menyiapkan ruang kerja…</div></div>`;
    warmUp('admin');
    const b = await muatBoot();
    if (!Sesi.token) return;
    if (!b && !App.boot) return tampilLogin('Gagal memuat data awal. Periksa koneksi lalu coba lagi.');
    shell();
    Router.jalankan();
  }
  document.addEventListener('rute', (e) => {
    if (!Sesi.token) return tampilLogin();
    if (!$('#page')) return mulaiApp();
    const { seg, params } = e.detail;
    let id = seg[0];
    if (!id || !App.halaman[id] || !App.bisa(id)) {
      const tujuan = BERANDA[App.peran()] || 'dashboard';
      if (id && App.halaman[id] && !App.bisa(id)) UI.toast('Akses dibatasi', 'Menu ini tidak tersedia untuk peran Anda.', 'warn');
      return Router.go('/' + tujuan);
    }
    if (App.aktif && App.aktif.keluar) { try { App.aktif.keluar(); } catch (x) { } }
    App.setPoll(null); UI.sembunyiTip();
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.id === id));
    // elemen halaman baru setiap navigasi → listener halaman lama ikut terbuang
    const lama = $('#page'), page = lama.cloneNode(false); lama.replaceWith(page); window.scrollTo(0, 0);
    App._jaga = null;
    App.aktif = App.halaman[id];
    try { App.aktif.render(page, seg.slice(1), params); } catch (x) { console.error(x); page.innerHTML = `<div class="note danger">${ik('error', 's18')} Terjadi kesalahan tampilan: ${esc(x.message)}</div>`; }
  });

  /* Pengaman navigasi dari form yang belum disimpan */
  App.jagaPerubahan = (cekFn) => { App._jaga = cekFn; };
  addEventListener('beforeunload', (e) => { if (App._jaga && App._jaga()) { e.preventDefault(); e.returnValue = ''; } });

  document.addEventListener('DOMContentLoaded', () => { if (Sesi.token && !/darurat/.test(location.hash)) mulaiApp(); else tampilLogin(); });
})();
