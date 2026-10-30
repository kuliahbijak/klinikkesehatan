/* ==========================================================================
   SIMRS Mini — layar.js : Layar Panggilan Antrean (TV ruang tunggu)
   • Masuk dengan "Kode Layar" (8 karakter, dari Kelola → Layar Panggilan) — disimpan di TV ini.
   • Menarik 'display.data' tiap N detik (data di-cache server → hemat kuota).
   • Panggilan baru → sorot nomor, nada ding-dong + suara (Web Speech) di TV, kilat layar penuh.
   • Suara berjalan di perangkat TV → tidak memakai kuota Apps Script.
   ========================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, c) => `<span class="ms ${c || ''}" aria-hidden="true">${esc(n)}</span>`;
  const $ = (s, r) => (r || document).querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const K_KODE = 'layar.kode', K_SET = 'layar.setelan';
  const urlOk = () => !!CFG.GAS_URL && /^https?:\/\//.test(CFG.GAS_URL) && !/GANTI|XXXX/.test(CFG.GAS_URL);
  const dasarUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '');

  let kode = String(LS.get(K_KODE, '') || '');
  const setelan = Object.assign({ suaraAktif: true, gender: '', suara: '', kecepatan: '', kilat: true }, LS.get(K_SET, {}));
  let data = null, sudah = new Set(), pertama = true, audioOn = false, gagal = 0, pollT = null, antri = Promise.resolve(), mediaSig = '', qrUrl = '', tickerTeks = '';
  const tv = document.getElementById('tv');

  /* ---------------------------------------------------------------- API */
  async function api(action, d) {
    if (!urlOk()) return { success: false, code: 'CONFIG', message: 'GAS_URL di js/config.js belum diisi.' };
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
      const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: '', data: d || {} }), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(to);
      return await r.json();
    } catch (e) { return { success: false, code: 'NET', message: 'Tidak dapat terhubung ke server.' }; }
  }

  /* ---------------------------------------------------------------- kerangka */
  function kerangka() {
    tv.innerHTML = `
    <header class="kartu tv-head">
      <div class="brand"><div class="logo" id="logo">${ik('local_hospital', 'fill')}</div>
        <div class="trunc"><h1 class="trunc"><span id="nama">SIMRS Mini</span><span class="akr" id="akr" hidden></span></h1><div class="sub trunc" id="subjudul"></div></div></div>
      <div class="head-r">
        <div class="pil audio mati" id="pil-audio" role="button" tabindex="0">${ik('volume_off')}<span>Audio nonaktif — ketuk layar</span></div>
        <div class="pil live" id="pil-live"><span class="titik"></span><span>Live Antrean</span></div>
        <div class="jam">${ik('schedule')}<div><b id="jam">--:--:--</b><span id="tgl"></span></div></div>
      </div>
    </header>
    <div class="panggung">
      <section class="kartu sorot" id="sorot" aria-label="Panggilan saat ini">
        <div class="sorot-h"><span class="pil panggil">${ik('campaign', 'fill')}Sedang Dipanggil Sekarang</span><span class="pil waktu" id="s-waktu">${ik('notifications_active')}<span>Menunggu panggilan</span></span></div>
        <div class="nomor-box"><span class="lbl" id="s-lbl">Nomor Antrean</span><div class="nomor kosong" id="s-no">—</div><div class="pasien" id="s-ps" hidden>${ik('person')}<span class="trunc"></span></div></div>
        <div class="tujuan" id="s-tj"><div class="row-tj" style="display:flex;align-items:center;gap:.9rem;min-width:0"><div class="ik">${ik('stethoscope')}</div><div style="min-width:0"><small id="s-tj-lbl">Tujuan</small><b class="trunc" id="s-tj-nm">Silakan menunggu panggilan</b></div></div>${ik('arrow_circle_right')}</div>
        <div class="dokter" id="s-dk" hidden>${ik('stethoscope')}<div><small>Dokter Penanggung Jawab</small><b id="s-dk-nm"></b></div></div>
        <div class="petunjuk" id="s-pt" hidden>${ik('directions_walk')}<span></span></div>
        <div class="riwayat"><span>Sebelumnya</span><div class="riwayat-list" id="s-rw"><span class="rw"><span>Belum ada</span></span></div></div>
      </section>
      <section class="kartu media" aria-label="Informasi klinik">
        <div class="media-h"><h2>${ik('slideshow')}Profil Fasilitas &amp; Edukasi Kesehatan</h2><div style="display:flex;gap:.5rem"><span class="pil mini hijau" id="m-status"><span class="titik"></span>Putar otomatis</span></div></div>
        <div class="layar-media" id="m-stage"></div>
        <div class="berikut" id="m-next" hidden><div style="display:flex;align-items:center;gap:.75rem;min-width:0"><div class="th" id="m-next-th"></div><div style="min-width:0"><small>Slide berikutnya</small><b class="trunc" id="m-next-jd"></b><span class="ket" id="m-next-ket"></span></div></div><div class="dots" id="m-dots"></div></div>
      </section>
    </div>
    <section aria-label="Status poli">
      <div class="status-h"><h2>${ik('view_timeline')}Status Semua Poli &amp; Farmasi</h2><span>Pembaruan otomatis</span></div>
      <div class="status-grid" id="status"></div>
    </section>
    <footer class="tv-foot">
      <span class="flag">${ik('info')}Informasi</span>
      <div class="marquee"><div id="ticker"></div></div>
      <div class="qr-hp"><div class="q" id="qr"></div><div><b>Pantau lewat HP</b><span>Pindai untuk info antrean</span></div></div>
    </footer>
    <button class="gear" id="gear" aria-label="Setelan layar">${ik('settings')}</button>`;
    $('#gear').onclick = panel;
    $('#pil-audio').onclick = () => { if (!audioOn) mulaiAudio(); };
  }

  /* ---------------------------------------------------------------- jam */
  function jam() {
    const n = new Date(), p = (x) => String(x).padStart(2, '0');
    const j = $('#jam'), t = $('#tgl');
    if (j) j.textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
    if (t) t.textContent = `${HARI[n.getDay()]}, ${n.getDate()} ${BULAN[n.getMonth()]} ${n.getFullYear()}`;
    waktuSorot();
  }
  const parseWaktu = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null; };
  function waktuSorot() {
    const el = $('#s-waktu span:last-child'); if (!el || !data || !data.feed || !data.feed[0]) return;
    const w = parseWaktu(data.feed[0].waktu); if (!w) return;
    const dt = Math.round((Date.now() - w.getTime()) / 1000);
    el.textContent = dt < 0 || dt > 3600 ? 'Pukul ' + String(data.feed[0].waktu).slice(11, 16) : dt < 60 ? `Baru saja (${dt} dtk lalu)` : `${Math.floor(dt / 60)} menit lalu`;
  }

  /* ---------------------------------------------------------------- render */
  function render(d) {
    const l = d.layar || {};
    $('#nama').textContent = l.nama || 'Klinik';
    const akr = $('#akr'); akr.hidden = !l.akreditasi; akr.textContent = l.akreditasi || '';
    $('#subjudul').textContent = 'SIMRS Mini' + (l.subjudul ? ' • ' + l.subjudul : '');
    document.title = 'Layar Antrean — ' + (l.nama || 'Klinik');
    const logo = $('#logo');
    if (l.logo && /^https:\/\//.test(l.logo)) { if (!logo.querySelector('img')) logo.innerHTML = `<img src="${esc(l.logo)}" alt="">`; } else if (logo.querySelector('img')) logo.innerHTML = ik('local_hospital', 'fill');
    sorot(d.feed || []);
    status(d.kartu || []);
    media(l.media || []);
    ticker(l.ticker || '');
    qr((l.appUrl ? String(l.appUrl).replace(/\/?$/, '/') : dasarUrl()) + 'pantau.html');
  }
  function labelTujuan(t) { return t === 'FARMASI' ? 'Farmasi' : t === 'KASIR' ? 'Kasir' : 'Poli'; }
  function sorot(feed) {
    const p = feed[0], box = $('#sorot');
    if (!p) { $('#s-no').textContent = '—'; $('#s-no').classList.add('kosong'); return; }
    $('#s-lbl').textContent = 'Nomor Antrean ' + labelTujuan(p.tujuan);
    const no = $('#s-no'); no.textContent = p.no; no.classList.remove('kosong');
    const ps = $('#s-ps'); ps.hidden = !p.pasien; $('span.trunc', ps).textContent = p.pasien || '';
    $('#s-tj .ik').innerHTML = ik(p.ikon || 'stethoscope');
    $('#s-tj-lbl').textContent = p.tujuan === 'POLI' ? 'Tujuan Poliklinik' : 'Tujuan Loket';
    $('#s-tj-nm').textContent = (p.nama_tujuan || '') + (p.ruang ? ' — ' + p.ruang : '');
    const dk = $('#s-dk'); dk.hidden = !p.dokter; $('#s-dk-nm').textContent = p.dokter || '';
    const pt = $('#s-pt'); pt.hidden = !p.petunjuk; $('span:not(.ms)', pt).textContent = p.petunjuk ? 'Petunjuk: ' + p.petunjuk : '';
    const rw = feed.slice(1, 6);
    $('#s-rw').innerHTML = rw.length ? rw.map((x) => `<span class="rw"><b>${esc(x.no)}</b><span>${esc(x.nama_tujuan || '')}</span></span>`).join('') : '<span class="rw"><span>Belum ada</span></span>';
    if (box) box.setAttribute('aria-label', 'Panggilan saat ini: ' + p.no + ' ke ' + (p.nama_tujuan || ''));
    waktuSorot();
  }
  function status(kartu) {
    $('#status').innerHTML = kartu.map((k) => {
      const kelas = k.status === 'Menuju Ruangan' ? 'menuju' : k.status === 'Pemeriksaan' ? 'periksa' : k.status === 'Siap Diambil' ? 'siap' : 'belum';
      const far = k.jenis === 'FARMASI';
      return `<div class="kartu sp ${far ? 'farmasi' : ''}" data-kode="${esc(k.kode)}">
        <div style="display:flex;align-items:center;gap:.8rem;min-width:0;flex:1"><div class="no"><small>${far ? 'Obat' : 'No. Poli'}</small><b class="${k.nomor ? '' : 'kosong'}">${esc(k.nomor || '—')}</b></div>
        <div class="isi"><span class="nm trunc" title="${esc(k.nama)}">${esc(k.nama)}${k.ruang ? `<em>• ${esc(k.ruang)}</em>` : ''}</span>${k.nomor && k.pasien ? `<span class="ps trunc">${esc(k.pasien)}</span>` : ''}<span class="dk trunc">${esc(k.dokter || (far ? 'Ambil obat sesuai nomor' : ''))}</span></div></div>
        <div class="kn"><span class="st ${kelas}">${far && k.nomor ? ik('medication') : '<span class="titik"></span>'}${esc(k.status === 'Belum ada panggilan' ? 'Belum dipanggil' : k.status)}</span><span class="sisa">${far ? (k.nomor ? 'Resep selesai' : '') : 'Menunggu: ' + (k.menunggu || 0)}</span></div></div>`;
    }).join('');
  }
  function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; }
  const aman = (u) => /^https:\/\//i.test(u) || /^(img|media)\/[\w./-]+$/i.test(u);
  let slideIdx = 0, slideT = null, slides = [];
  function media(list) {
    const sig = JSON.stringify(list); if (sig === mediaSig) return; mediaSig = sig;
    slides = (Array.isArray(list) ? list : []).filter((m) => m && m.url && aman(String(m.url).trim()));
    const st = $('#m-stage'); clearTimeout(slideT); slideIdx = 0;
    if (!slides.length) {
      st.innerHTML = `<div class="info-klinik">${ik('health_and_safety')}<b>${esc((data && data.layar && data.layar.nama) || 'Klinik')}</b><span>Mohon menunggu, nomor Anda akan dipanggil.</span></div>`;
      $('#m-next').hidden = true; $('#m-status').hidden = true; return;
    }
    $('#m-status').hidden = slides.length < 2;
    st.innerHTML = slides.map((m, i) => {
      const j = m.jenis || 'gambar', u = String(m.url).trim();
      let isi = '';
      if (j === 'youtube') { const id = ytId(u); isi = id ? `<iframe data-src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1" allow="autoplay; encrypted-media" title="${esc(m.judul || 'Video')}"></iframe>` : ''; }
      else if (j === 'video') isi = `<video muted playsinline preload="none" data-src="${esc(u)}"></video>`;
      else isi = `<img src="${esc(u)}" alt="${esc(m.judul || '')}" loading="${i ? 'lazy' : 'eager'}">`;
      return `<div class="slide" data-i="${i}">${isi}<div class="tutup"><span class="tag">${ik(j === 'gambar' ? 'photo' : 'smart_display')}${j === 'gambar' ? 'Info Klinik' : 'Video Edukasi'}</span><div class="cap">${m.judul ? `<b>${esc(m.judul)}</b>` : ''}${m.keterangan ? `<span>${esc(m.keterangan)}</span>` : ''}</div></div><div class="bar"><i></i></div></div>`;
    }).join('');
    tampilSlide(0);
  }
  function tampilSlide(i) {
    clearTimeout(slideT);
    const st = $('#m-stage'), semua = st.querySelectorAll('.slide'); if (!semua.length) return;
    slideIdx = (i + slides.length) % slides.length;
    semua.forEach((el, k) => {
      const on = k === slideIdx; el.classList.toggle('on', on);
      const v = el.querySelector('video'), f = el.querySelector('iframe');
      if (v) { if (on) { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().catch(() => { }); } else v.pause(); }
      if (f) { if (on && !f.src) f.src = f.dataset.src; else if (!on && f.src) f.removeAttribute('src'); }
    });
    const m = slides[slideIdx], j = m.jenis || 'gambar', el = semua[slideIdx], bar = el.querySelector('.bar i');
    let dur = Number(m.durasi) * 1000 || (j === 'gambar' ? 15000 : j === 'youtube' ? 90000 : 0);
    const v = el.querySelector('video');
    if (slides.length > 1) {
      if (j === 'video' && v) { v.loop = false; v.onended = () => tampilSlide(slideIdx + 1); v.onloadedmetadata = () => { animBar(bar, (v.duration || 30) * 1000); }; slideT = setTimeout(() => tampilSlide(slideIdx + 1), 180000); }
      else { animBar(bar, dur); slideT = setTimeout(() => tampilSlide(slideIdx + 1), dur); }
    } else { if (v) v.loop = true; if (bar) bar.parentElement.hidden = true; }
    // strip "berikutnya"
    const nx = $('#m-next');
    if (slides.length > 1) {
      const n = slides[(slideIdx + 1) % slides.length], jn = n.jenis || 'gambar';
      nx.hidden = false;
      $('#m-next-th').innerHTML = jn === 'gambar' ? `<img src="${esc(String(n.url).trim())}" alt="">` : ik('play_circle');
      $('#m-next-jd').textContent = n.judul || (jn === 'gambar' ? 'Info klinik' : 'Video edukasi');
      $('#m-next-ket').textContent = j === 'gambar' ? 'Putar otomatis tiap ' + Math.round(dur / 1000) + ' detik' : 'Setelah video selesai';
      $('#m-dots').innerHTML = slides.map((_, k) => `<i class="${k === slideIdx ? 'on' : ''}"></i>`).join('');
    } else nx.hidden = true;
  }
  function animBar(bar, ms) { if (!bar) return; bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; }
  function ticker(t) {
    if (t === tickerTeks) return; tickerTeks = t;
    const el = $('#ticker'); el.textContent = t ? '📢 ' + t : 'Selamat datang. Mohon menunggu dengan tertib, nomor Anda akan dipanggil.';
    el.style.setProperty('--durasi', Math.max(25, Math.round(el.textContent.length * 0.2)) + 's');
  }
  function qr(url) {
    if (url === qrUrl || typeof window.qrcode !== 'function') return; qrUrl = url;
    try { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); $('#qr').innerHTML = q.createImgTag(3, 0); const img = $('#qr img'); if (img) img.alt = 'QR pantau antrean'; } catch (e) { }
  }

  /* ---------------------------------------------------------------- panggilan baru */
  function proses(d) {
    const feed = d.feed || [];
    if (pertama) { feed.forEach((p) => sudah.add(p.id)); pertama = false; return; }
    const baru = feed.filter((p) => !sudah.has(p.id)).reverse();
    baru.forEach((p) => { sudah.add(p.id); umumkan(p, (d.layar && d.layar.suara) || {}); });
    if (sudah.size > 400) sudah = new Set(feed.map((p) => p.id));
  }
  function umumkan(p, srv) {
    antri = antri.then(async () => {
      const box = $('#sorot'); if (box) { box.classList.remove('baru'); void box.offsetWidth; box.classList.add('baru'); }
      document.querySelectorAll('.sp.nyala').forEach((x) => x.classList.remove('nyala'));
      const cari = p.tujuan === 'FARMASI' ? document.querySelector('.sp[data-kode="FARMASI"]') : Array.from(document.querySelectorAll('.sp')).find((x) => x.querySelector('.no b') && x.querySelector('.no b').textContent === p.no);
      if (cari) { cari.classList.add('nyala'); setTimeout(() => cari.classList.remove('nyala'), 9000); }
      const k = setelan.kilat ? kilat(p) : null;
      const t0 = Date.now();
      if (audioOn && window.Suara && Suara.didukung && srv.aktif !== false && setelan.suaraAktif) {
        await Suara.umumkan({ no: p.no, nama_tujuan: p.nama_tujuan, ruang: p.ruang }, { gender: setelan.gender || srv.gender, suara: setelan.suara, kecepatan: Number(setelan.kecepatan) || srv.kecepatan || 0.9, ulang: srv.ulang || 2, chime: srv.chime !== false });
      }
      const sisa = 6500 - (Date.now() - t0); if (sisa > 0) await sleep(sisa);
      if (k) k.remove();
      await sleep(400);
    }).catch(() => { });
  }
  function kilat(p) {
    const el = document.createElement('div'); el.className = 'kilat'; el.setAttribute('role', 'alert');
    el.innerHTML = `<div><div class="k-lbl">Nomor Antrean</div><div class="k-no">${esc(p.no)}</div>${p.pasien ? `<div class="k-ps">${esc(p.pasien)}</div>` : ''}<div class="k-tj">${ik(p.ikon || 'stethoscope')}${esc(p.nama_tujuan || '')}${p.ruang ? ' — ' + esc(p.ruang) : ''}</div></div>`;
    el.onclick = () => el.remove();
    document.body.appendChild(el); return el;
  }

  /* ---------------------------------------------------------------- polling */
  async function tarik() {
    clearTimeout(pollT);
    const r = await api('display.data', { key: kode });
    const live = $('#pil-live');
    if (r.success) {
      gagal = 0; data = r.data;
      if (live) { live.classList.remove('putus'); live.lastElementChild.textContent = 'Live Antrean'; }
      render(data); proses(data);
    } else if (r.code === 'DISPLAY_KEY') {
      LS.del(K_KODE); kode = ''; return minta(r.message);
    } else {
      gagal++;
      if (live) { live.classList.add('putus'); live.lastElementChild.textContent = r.code === 'CONFIG' ? 'Belum dikonfigurasi' : 'Terputus — mencoba lagi'; }
      if (r.code === 'CONFIG') return minta(r.message, true);
    }
    const dasar = Math.min(15, Math.max(3, Number(data && data.layar && data.layar.polling) || 4)) * 1000;
    const jeda = document.hidden ? 30000 : gagal ? Math.min(60000, 4000 * gagal) : dasar;
    pollT = setTimeout(tarik, jeda);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && kode) { tarik(); kunciLayar(); } });

  /* ---------------------------------------------------------------- audio, layar penuh, wake lock */
  function mulaiAudio() {
    if (window.Suara) Suara.aktifkan();
    audioOn = true;
    const p = $('#pil-audio'); if (p) { p.classList.remove('mati'); p.innerHTML = ik('volume_up') + '<span>Audio Pemanggilan Aktif</span>'; }
  }
  let kunci = null;
  async function kunciLayar() { try { if ('wakeLock' in navigator && !document.hidden) kunci = await navigator.wakeLock.request('screen'); } catch (e) { kunci = null; } }
  function layarPenuh() { const d = document.documentElement; try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => { }); } catch (e) { } }

  /* ---------------------------------------------------------------- overlay kode & mulai */
  function overlay(html) { let o = $('#ovl'); if (!o) { o = document.createElement('div'); o.id = 'ovl'; o.className = 'ovl'; document.body.appendChild(o); } o.innerHTML = `<div class="ovl-box">${html}</div>`; return o; }
  function tutupOverlay() { const o = $('#ovl'); if (o) o.remove(); }
  function minta(pesan, konfig) {
    clearTimeout(pollT);
    const o = overlay(`${ik('connected_tv', 'big')}<h2>Hubungkan Layar Panggilan</h2>
      <p>Masukkan <b>Kode Layar</b> 8 karakter dari menu <b>Kelola → Layar Panggilan</b> di aplikasi (akun Admin). Kode disimpan di TV ini.</p>
      ${pesan ? `<div class="err">${esc(pesan)}</div>` : ''}
      ${konfig ? '' : `<input id="in-kode" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="KODE" aria-label="Kode layar"><button class="tbl-btn" id="btn-kode" style="width:100%">${ik('link')}Hubungkan</button>`}`);
    if (konfig) return;
    const inp = $('#in-kode', o), btn = $('#btn-kode', o);
    inp.focus();
    const kirim = async () => {
      const v = inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (v.length < 6) { inp.focus(); return; }
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      const r = await api('display.data', { key: v });
      if (r.success) { kode = v; LS.set(K_KODE, v); data = r.data; pertama = true; render(data); proses(data); mulai(); }
      else { btn.disabled = false; btn.innerHTML = ik('link') + 'Hubungkan'; const e = o.querySelector('.err') || Object.assign(document.createElement('div'), { className: 'err' }); e.textContent = r.message; if (!e.parentNode) inp.before(e); inp.select(); }
    };
    btn.onclick = kirim; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') kirim(); });
  }
  function mulai() {
    const o = overlay(`${ik('volume_up', 'big')}<h2>Siap Menampilkan Antrean</h2><p>Ketuk tombol di bawah agar TV boleh memutar <b>nada & suara panggilan</b> (aturan browser). Layar akan masuk mode layar penuh.</p>
      <div style="display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap"><button class="tbl-btn" id="btn-mulai">${ik('play_arrow')}Mulai dengan suara</button><button class="tbl-btn sek" id="btn-senyap">Tanpa suara</button></div>`);
    $('#btn-mulai', o).onclick = () => { mulaiAudio(); layarPenuh(); kunciLayar(); tutupOverlay(); if (window.Suara && Suara.didukung) Suara.chime(); };
    $('#btn-senyap', o).onclick = () => { kunciLayar(); tutupOverlay(); };
    tarik();
  }

  /* ---------------------------------------------------------------- panel setelan */
  function panel() {
    const ada = $('#panel'); if (ada) { ada.remove(); return; }
    const srv = (data && data.layar && data.layar.suara) || {};
    const suaraId = window.Suara ? Suara.daftarIndonesia() : [];
    const el = document.createElement('div'); el.id = 'panel'; el.className = 'panel';
    el.innerHTML = `<h3>Setelan TV ini <button class="tbl-btn sek" style="height:2rem;padding:0 .6rem" data-x aria-label="Tutup">${ik('close')}</button></h3>
      <label class="cek"><input type="checkbox" data-k="suaraAktif" ${setelan.suaraAktif ? 'checked' : ''}> Suara panggilan di TV ini</label>
      <label>Jenis suara<select data-k="gender"><option value="">Ikuti pengaturan klinik (${esc(srv.gender || 'perempuan')})</option><option value="perempuan" ${setelan.gender === 'perempuan' ? 'selected' : ''}>Perempuan</option><option value="laki-laki" ${setelan.gender === 'laki-laki' ? 'selected' : ''}>Laki-laki</option></select></label>
      <label>Pilihan suara perangkat<select data-k="suara"><option value="">Otomatis</option>${suaraId.map((v) => `<option ${setelan.suara === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      ${suaraId.length ? '' : '<div class="ket">Perangkat ini belum punya suara Bahasa Indonesia. Gunakan Google Chrome/Microsoft Edge terbaru, atau pasang suara "Indonesia" di pengaturan Text-to-Speech perangkat.</div>'}
      <label>Kecepatan bicara<select data-k="kecepatan"><option value="">Ikuti klinik (${esc(srv.kecepatan || 0.9)})</option>${['0.8', '0.85', '0.9', '1', '1.1'].map((x) => `<option ${String(setelan.kecepatan) === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="cek"><input type="checkbox" data-k="kilat" ${setelan.kilat ? 'checked' : ''}> Sorot layar penuh saat ada panggilan</label>
      <div class="baris"><button class="tbl-btn" data-a="tes">${ik('record_voice_over')}Tes suara</button><button class="tbl-btn sek" data-a="penuh">${ik('fullscreen')}Layar penuh</button></div>
      <div class="baris"><button class="tbl-btn sek" data-a="kode">${ik('key')}Ganti kode</button><button class="tbl-btn sek" data-a="muat">${ik('refresh')}Muat ulang</button></div>
      <div class="ket">Setelan ini hanya tersimpan di TV ini. Kalimat: "Nomor antrean, A, dua belas. Silakan menuju Poli Umum, Ruang 1."</div>`;
    document.body.appendChild(el);
    el.addEventListener('change', (e) => { const t = e.target; if (!t.dataset.k) return; setelan[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value; LS.set(K_SET, setelan); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) el.remove();
      const a = b.dataset.a;
      if (a === 'tes') { if (!audioOn) mulaiAudio(); const p = (data && data.kartu || []).find((k) => k.jenis === 'POLI') || { nama: 'Poli Umum', ruang: 'Ruang 1' }; Suara.umumkan({ no: 'A-012', nama_tujuan: p.nama, ruang: p.ruang }, { gender: setelan.gender || srv.gender, suara: setelan.suara, kecepatan: Number(setelan.kecepatan) || srv.kecepatan || 0.9, ulang: 1, chime: srv.chime !== false }); }
      if (a === 'penuh') layarPenuh();
      if (a === 'kode') { el.remove(); LS.del(K_KODE); kode = ''; minta(); }
      if (a === 'muat') location.reload();
    });
  }

  /* ---------------------------------------------------------------- kursor & muat ulang harian */
  let gerakT = null;
  addEventListener('mousemove', () => { document.body.classList.add('aktif-mouse'); document.body.classList.remove('kursor-sembunyi'); clearTimeout(gerakT); gerakT = setTimeout(() => { if (!$('#panel')) { document.body.classList.remove('aktif-mouse'); document.body.classList.add('kursor-sembunyi'); } }, 3500); }, { passive: true });
  (function jadwalMuatUlang() { const n = new Date(), b = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 3, 0); setTimeout(() => location.reload(), b - n); })();

  /* ---------------------------------------------------------------- start */
  function start() {
    kerangka(); jam(); setInterval(jam, 1000);
    // kode bisa dibawa sekali lewat #kode=XXXX (lalu dihapus dari alamat)
    const m = location.hash.match(/kode=([A-Za-z0-9]{6,12})/);
    if (m) { kode = m[1].toUpperCase(); LS.set(K_KODE, kode); history.replaceState(null, '', location.pathname + location.search); }
    if (!urlOk()) return minta('Alamat server (GAS_URL) di js/config.js belum diisi. Hubungi admin.', true);
    if (!kode) return minta();
    mulai();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
