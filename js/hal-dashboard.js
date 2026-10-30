/* SIMRS Mini — Dashboard (semua peran, isi disesuaikan peran di server) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, swr, UI, Router, Grafik, kalender, Sesi } = S;
  let state = { poli: '', hal: 1, bln: null, data: null };
  const PER_HAL = 6;

  function sesiLabel(jm) { const h = Number(String(jm).slice(0, 2)) || 0; return h < 11 ? 'Sesi Pagi' : h < 15 ? 'Sesi Siang' : h < 18 ? 'Sesi Sore' : 'Sesi Malam'; }
  function menit(j) { const p = String(j || '').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }

  function aksiBaris(k) {
    const pm = App.poliMap(), me = Sesi.me, bolehPoli = !me.poli || !me.poli.length || me.poli.indexOf(k.poli) >= 0;
    const dokter = App.punya('DOKTER') && (me.role === 'ADMIN' || bolehPoli);
    const b = [];
    if (['Menunggu', 'Dipanggil'].includes(k.status) && (App.punya('PENDAFTARAN') || dokter)) b.push(`<button class="btn sm ${k.status === 'Menunggu' ? 'soft' : 'secondary'}" data-panggil="${esc(k.id_kunjungan)}">${ik('campaign', 's16')} ${k.status === 'Dipanggil' ? 'Ulang' : 'Panggil'}</button>`);
    if (['Menunggu', 'Dipanggil', 'Diperiksa'].includes(k.status) && dokter) b.push(`<a class="btn sm ${k.status === 'Diperiksa' ? 'primary' : 'secondary'}" href="#/rme/${encodeURIComponent(k.id_kunjungan)}">${ik('edit_note', 's16')} ${k.status === 'Diperiksa' ? 'Input RME' : 'Periksa'}</a>`);
    if (k.status === 'Selesai Periksa') b.push('<span class="lbl-sm muted">Ke Farmasi / Kasir</span>');
    if (!b.length) b.push(`<button class="btn sm ghost" data-detail="${esc(k.id_kunjungan)}">Detail</button>`);
    return b.join('');
  }
  function statusTeks(k) { return k.status === 'Menunggu' ? `Menunggu (Urutan ${k.posisi})` : k.status === 'Selesai Periksa' ? 'Selesai Periksa' : k.status; }

  function renderTabel(el) {
    const d = state.data; if (!d) return;
    const pm = App.poliMap();
    const rows = d.antrean.filter((k) => k.status !== 'Batal' && (!state.poli || k.poli === state.poli));
    const per = {}; d.antrean.forEach((k) => { if (k.status !== 'Batal') per[k.poli] = (per[k.poli] || 0) + 1; });
    const total = d.antrean.filter((k) => k.status !== 'Batal').length;
    $('#dash-pills', el).innerHTML = `<button class="pill ${!state.poli ? 'on' : ''}" data-poli="">Semua Poli (${total})</button>` + Object.keys(per).map((p) => `<button class="pill ${state.poli === p ? 'on' : ''}" data-poli="${esc(p)}">${esc((pm[p] || {}).nama || p)} (${per[p]})</button>`).join('');
    const maxHal = Math.max(1, Math.ceil(rows.length / PER_HAL)); state.hal = Math.min(state.hal, maxHal);
    const tampil = rows.slice((state.hal - 1) * PER_HAL, state.hal * PER_HAL);
    $('#dash-tbody', el).innerHTML = tampil.length ? tampil.map((k) => `<tr class="${k.status === 'Selesai' ? 'done' : ''}">
        <td><span class="tag-no ${['Diperiksa', 'Dipanggil'].includes(k.status) ? 'aktif' : ''}">${esc(k.no_antrean)}</span></td>
        <td data-c="full"><div class="col" style="gap:0"><span class="nm">${esc(k.nama_pasien)}</span><span class="sub mono">${esc(k.id_rm)} • ${esc(k.umur)} (${esc(F.jk(k.jk))})</span></div></td>
        <td class="hide-m"><div class="col" style="gap:0"><span class="lbl">${esc((pm[k.poli] || {}).nama || k.poli)}</span><span class="sub">${esc(k.dokter_nama || '')}</span></div></td>
        <td class="mono muted hide-m col-jam">${esc(k.jam)} WIB</td>
        <td>${UI.badgeStatus(k.status).replace('>' + esc(k.status) + '<', '>' + esc(statusTeks(k)) + '<')}${k.prioritas !== 'Normal' ? ' ' + UI.badgeStatus(k.prioritas) : ''}</td>
        <td class="aksi-c"><div class="aksi">${aksiBaris(k)}</div></td></tr>`).join('') : `<tr><td colspan="6">${UI.kosong('Belum ada antrean hari ini', 'event_available')}</td></tr>`;
    $('#dash-foot', el).innerHTML = `<span class="t-sm muted">Menampilkan ${tampil.length} dari ${rows.length} antrean hari ini</span><div class="row gap-xs"><button class="btn sm ghost" data-hal="-1" ${state.hal <= 1 ? 'disabled' : ''}>Sebelumnya</button><span class="tag-no">${state.hal}</span><button class="btn sm ghost" data-hal="1" ${state.hal >= maxHal ? 'disabled' : ''}>Berikutnya</button></div>`;
  }

  function renderKalender(el) {
    const now = new Date(); if (!state.bln) state.bln = { y: now.getFullYear(), m: now.getMonth() };
    const k = kalender(state.bln.y, state.bln.m);
    $('#cal-judul', el).textContent = k.judul; $('#cal', el).innerHTML = k.html;
  }

  function render(el, d) {
    state.data = d; if (!d) return;
    const k = d.kartu, full = !!d.tren, me = Sesi.me;
    const delta = k.pasienKemarin ? Math.round(((k.pasien - k.pasienKemarin) / k.pasienKemarin) * 100) : null;
    $('#dash-kpi', el).className = 'grid ' + (k.pendapatan !== undefined ? 'g4' : 'g3');
    $('#dash-kpi', el).innerHTML = `
      <div class="card kpi"><div class="row between top"><div class="col"><span class="eyebrow">Pasien hari ini</span><span class="v">${F.angka(k.pasien)}</span></div><div class="ic">${ik('stethoscope', 's22')}</div></div>
        <div class="foot">${delta === null ? '<span>&nbsp;</span>' : `<span class="${delta >= 0 ? 'trend-up' : 'trend-down'}">${ik(delta >= 0 ? 'trending_up' : 'trending_down', 's16')} ${delta >= 0 ? '+' : ''}${delta}%</span>`}<span>vs. kemarin (${F.angka(k.pasienKemarin)})</span></div></div>
      <div class="card kpi"><div class="row between top"><div class="col"><span class="eyebrow">Antrean aktif</span><span class="v">${F.angka(k.antrean.aktif)}</span></div><div class="ic amber">${ik('timer', 's22')}</div></div>
        <div class="foot"><span class="row gap-xs amber-t sb"><span class="badge warn" style="padding:0;width:8px;height:8px"></span>${F.angka(k.antrean.dipanggil)} Dipanggil</span><span>${F.angka(k.antrean.menunggu)} Menunggu</span></div></div>
      <div class="card kpi"><div class="row between top"><div class="col"><span class="eyebrow">Resep farmasi</span><span class="v">${F.angka(k.resep.total)}</span></div><div class="ic">${ik('medication', 's22')}</div></div>
        <div class="foot"><span class="row gap-xs teal sb">${ik('check_circle', 's16')} ${F.angka(k.resep.siap)} Siap Diambil</span><span>${F.angka(k.resep.diserahkan)} diserahkan</span></div></div>
      ${k.pendapatan !== undefined ? `<div class="card kpi"><div class="row between top"><div class="col"><span class="eyebrow">Pendapatan hari ini</span><span class="v" style="font-size:24px">${F.rp(k.pendapatan)}</span></div><div class="ic">${ik('payments', 's22')}</div></div>
        <div class="foot"><span>${F.rp(k.ditanggung)} ditanggung penjamin</span><span class="${k.belumBayar ? 'red sb' : ''}">${F.angka(k.belumBayar)} belum bayar</span></div></div>` : ''}`;
    renderTabel(el);
    // kartu layar & farmasi
    const L = d.layar, sm = d.stok;
    $('#dash-cards', el).innerHTML = `
      <div class="card dark stack sm"><div class="row between"><span class="lbl-sm up" style="color:#C8CED6">Layar Panggilan Antrean</span><span class="ms" style="color:var(--amber)">campaign</span></div>
        ${L ? `<h3 class="h-md">${esc(L.no_antrean)} → ${esc(L.nama_tujuan)}</h3><p class="t-sm muted">Dipanggil ${esc(F.relatif(L.waktu))} oleh ${esc(L.petugas)}${L.ke > 1 ? ' • panggilan ke-' + L.ke : ''}.</p>` : '<h3 class="h-md">Belum ada panggilan hari ini</h3><p class="t-sm muted">Tombol Panggil pada daftar antrean akan dibacakan di layar TV ruang tunggu.</p>'}
        <div class="row between mt-sm"><span class="mono t-xs muted">Suara: ${esc(App.st().SUARA_GENDER || 'perempuan')} • ${App.st().SUARA_AKTIF === 'TIDAK' ? 'mati' : 'aktif'}</span><a class="link-btn" style="color:var(--amber)" href="display.html" target="_blank" rel="noopener">Buka Layar TV ${ik('chevron_right', 's16')}</a></div></div>
      <div class="card amber stack sm"><div class="row between"><span class="lbl-sm up b">Peringatan Farmasi</span>${ik('warning')}</div>
        <h3 class="h-md">${sm.menipis.length ? sm.menipis.length + ' Obat Menipis' : 'Stok obat aman'}${sm.hampirEd ? ` • ${sm.hampirEd} hampir kedaluwarsa` : ''}</h3>
        <p class="t-sm">${sm.menipis.length ? esc(sm.menipis.slice(0, 4).map((o) => `${o.nama} (${o.stok} ${o.satuan})`).join(', ')) + ' telah mencapai batas minimum restock.' : 'Tidak ada obat di bawah stok minimum.'}</p>
        <div class="row between mt-sm"><span class="mono t-xs">Diperbarui ${F.jam()} WIB</span>${App.punya('FARMASI') ? `<a class="btn sm secondary" href="#/farmasi?tab=stok">Lihat Stok Obat</a>` : ''}</div></div>`;
    // grafik (admin & manajemen)
    const gEl = $('#dash-grafik', el);
    if (full) {
      gEl.hidden = false;
      Grafik.kolom($('#g-kunjungan', el), d.tren.map((t, i) => ({ label: F.tgl(t.tanggal).split(' ').slice(0, 2).join(' '), judul: F.tgl(t.tanggal), nilai: t.kunjungan })), { sorotAkhir: true, tinggi: 180, judul: 'Kunjungan 7 hari', format: (v) => F.angka(v) + ' kunjungan', kosong: 'Belum ada kunjungan dalam 7 hari terakhir' });
      Grafik.kolom($('#g-pendapatan', el), d.tren.map((t) => ({ label: F.tgl(t.tanggal).split(' ').slice(0, 2).join(' '), judul: F.tgl(t.tanggal), nilai: t.pendapatan })), { sorotAkhir: true, tinggi: 180, judul: 'Pendapatan 7 hari', format: F.rp, kosong: 'Belum ada pembayaran dalam 7 hari terakhir' });
      Grafik.batang($('#g-dx', el), (d.diagnosis || []).map((x) => ({ kode: x.kode, label: x.nama, nilai: x.jumlah })), { format: (v) => F.angka(v) + ' kasus', kosong: 'Belum ada diagnosis final 30 hari terakhir' });
    } else gEl.hidden = true;
    // jadwal
    const now = new Date(), mNow = now.getHours() * 60 + now.getMinutes();
    $('#dash-jadwal', el).innerHTML = d.jadwal.length ? d.jadwal.map((j) => {
      const a = menit(j.jam_mulai), b = menit(j.jam_selesai), aktif = mNow >= a && mNow < b, lewat = mNow >= b, pct = aktif ? Math.round(((mNow - a) / Math.max(1, b - a)) * 100) : 0;
      return `<div class="sched ${aktif ? 'now' : ''}"><div class="row between"><span class="lbl" style="font-size:14px">${esc(j.dokter || '—')}</span>${aktif ? '<span class="badge teal">Aktif Sekarang</span>' : `<span class="t-xs muted">${lewat ? 'Selesai' : sesiLabel(j.jam_mulai)}</span>`}</div>
        <div class="row between t-sm muted"><span class="row gap-xs">${ik(j.ikon || 'stethoscope', 's16 ' + (aktif ? 'teal' : ''))} ${esc(j.poli)}</span><span class="mono">${esc(j.jam_mulai)} - ${esc(j.jam_selesai)}</span></div>
        ${aktif ? `<div class="bar-track" title="${pct}% sesi berjalan"><div class="bar-fill" style="width:${pct}%"></div></div>` : ''}</div>`;
    }).join('') : UI.kosong('Belum ada jadwal poli', 'schedule');
    $('#jadwal-n', el).textContent = d.jadwal.length + ' Sesi';
    $('#dash-akt', el).innerHTML = d.aktivitas.length ? d.aktivitas.map((a) => `<div class="act"><div class="ai">${ik(a.ikon, 's16')}</div><div class="col" style="gap:0"><span class="lbl">${esc(a.judul)}</span><span class="t-xs muted">${esc(a.isi)}</span><span class="mono t-xs muted">${esc(F.relatif(a.w))}</span></div></div>`).join('') : UI.kosong('Belum ada aktivitas', 'notifications');
    App.cekBell(d.aktivitas);
  }

  App.halaman.dashboard = {
    render(el) {
      const me = Sesi.me;
      const aksi = [];
      if (App.punya('PENDAFTARAN')) aksi.push(`<a class="btn primary" href="#/pendaftaran/baru">${ik('person_add', 's18')} Daftarkan Pasien</a>`);
      if (App.punya('DOKTER') && me.role !== 'ADMIN') aksi.push(`<a class="btn primary" href="#/rme">${ik('clinical_notes', 's18')} Antrean Pemeriksaan</a>`);
      if (App.punya('FARMASI') && me.role !== 'ADMIN') aksi.push(`<a class="btn primary" href="#/farmasi">${ik('prescriptions', 's18')} Antrean Resep</a>`);
      if (App.punya('KASIR') && me.role !== 'ADMIN') aksi.push(`<a class="btn primary" href="#/kasir">${ik('point_of_sale', 's18')} Buka Kasir</a>`);
      if (me.role === 'MANAJEMEN' || me.role === 'ADMIN') aksi.unshift(`<a class="btn secondary" href="#/laporan">${ik('analytics', 's18 teal')} Laporan</a>`);
      el.innerHTML = `
        <div class="split">
          <div class="stack lg">
            <div class="page-h" style="margin:0"><div><h1 class="h-lg">${esc(F.sapa())}, ${esc(me.nama)} <span aria-hidden="true">👋</span></h1><p class="t-sm">Berikut ringkasan operasional klinik hari ini — ${esc(F.tglPanjang())}</p></div><div class="row wrap">${aksi.join('')}<button class="btn icon secondary" id="dash-segar" title="Segarkan" aria-label="Segarkan">${ik('refresh')}</button></div></div>
            <div class="grid g3" id="dash-kpi">${'<div class="card"><div class="skel" style="height:90px"></div></div>'.repeat(3)}</div>
            <div class="card pad-0">
              <div class="row between wrap" style="padding:1rem 1.25rem"><div class="row"><h2 class="h-md">Antrean Poliklinik Berjalan</h2><span class="badge"><span class="dot pulse" style="background:var(--ok)"></span>Live Sync</span></div><div class="pills" id="dash-pills"></div></div>
              <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>No. Antrean</th><th>Pasien</th><th>Poli &amp; Dokter</th><th class="col-jam">Jam Daftar</th><th>Status</th><th class="ta-r">Tindakan</th></tr></thead><tbody id="dash-tbody"><tr><td colspan="6">${UI.skel(3)}</td></tr></tbody></table></div>
              <div class="tbl-foot" id="dash-foot"></div>
            </div>
            <div class="grid g2" id="dash-grafik" hidden>
              <div class="card"><div class="card-h"><h3>${ik('bar_chart')} Kunjungan 7 Hari</h3><span class="t-xs muted">pasien/hari</span></div><div id="g-kunjungan"></div></div>
              <div class="card"><div class="card-h"><h3>${ik('payments')} Pendapatan 7 Hari</h3><span class="t-xs muted">termasuk ditanggung penjamin</span></div><div id="g-pendapatan"></div></div>
              <div class="card" style="grid-column:1/-1"><div class="card-h"><h3>${ik('coronavirus')} Diagnosis Terbanyak (30 hari)</h3><a class="link-btn" href="#/laporan">Lihat laporan ${ik('chevron_right', 's16')}</a></div><div id="g-dx"></div></div>
            </div>
            <div class="grid g2" id="dash-cards"></div>
          </div>
          <div class="stack lg">
            <div class="card"><div class="row between mb-sm"><h3 class="row h-md">${ik('calendar_month', 'teal')} <span id="cal-judul"></span></h3><div class="row gap-xs"><button class="btn icon sm ghost" data-bln="-1" aria-label="Bulan sebelumnya">${ik('chevron_left')}</button><button class="btn icon sm ghost" data-bln="1" aria-label="Bulan berikutnya">${ik('chevron_right')}</button></div></div><div class="cal" id="cal"></div></div>
            <div class="card"><div class="row between mb-sm"><h3 class="row h-md">${ik('schedule', 'teal')} Jadwal Praktek Hari Ini</h3><span class="mono t-xs muted" id="jadwal-n"></span></div><div class="stack sm" id="dash-jadwal">${UI.skel(3)}</div></div>
            <div class="card"><div class="row between mb-sm"><h3 class="row h-md">${ik('notifications_active', 'teal')} Aktivitas Terkini</h3></div><div class="stack sm" id="dash-akt">${UI.skel(3)}</div></div>
          </div>
        </div>`;
      renderKalender(el);
      const muat = (paksa) => swr('dash', 'dashboard', {}, (d, dariCache, err) => { if (err) { $('#dash-tbody', el).innerHTML = `<tr><td colspan="6"><div class="note danger">${esc(err.message)}</div></td></tr>`; return; } render(el, d); }, { maxAge: 15000, phi: true, paksa });
      muat();
      App.setPoll(() => muat(false), 20000, 90000);
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('button,a'); if (!t) return;
        if (t.dataset.poli !== undefined) { state.poli = t.dataset.poli; state.hal = 1; renderTabel(el); }
        if (t.dataset.hal) { state.hal += Number(t.dataset.hal); renderTabel(el); }
        if (t.dataset.bln) { state.bln.m += Number(t.dataset.bln); if (state.bln.m < 0) { state.bln.m = 11; state.bln.y--; } if (state.bln.m > 11) { state.bln.m = 0; state.bln.y++; } renderKalender(el); }
        if (t.id === 'dash-segar') UI.sibuk(t, () => muat(true));
        if (t.dataset.panggil) { const r = await App.panggil(t.dataset.panggil, 'POLI', t); if (r) muat(true); }
        if (t.dataset.detail) {
          const k = state.data.antrean.find((x) => x.id_kunjungan === t.dataset.detail);
          if (k) UI.modal({ judul: 'Antrean ' + k.no_antrean, lebar: 'sm', isi: `<div class="kv"><div><span>Pasien</span><span>${esc(k.nama_pasien)}</span></div><div><span>No. RM</span><span class="mono">${esc(k.id_rm)}</span></div><div><span>Poli</span><span>${esc((App.poliMap()[k.poli] || {}).nama || k.poli)}</span></div><div><span>Status</span><span>${esc(k.status)}</span></div><div><span>Prioritas</span><span>${esc(k.prioritas)}</span></div><div><span>Penjamin</span><span>${esc(k.penjamin)}</span></div><div><span>Jam daftar</span><span>${esc(k.jam)} WIB</span></div><div><span>Keluhan awal</span><span>${esc(k.keluhan_awal || '-')}</span></div></div>`, aksi: [{ label: 'Tutup', kelas: 'primary' }] });
        }
      });
    }
  };
})();
