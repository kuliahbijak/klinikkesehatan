/* SIMRS Mini — Pendaftaran & Antrean (Admin, Petugas Pendaftaran) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, swr, UI, Router, Sesi } = S;

  /* ===================================================== DAFTAR ANTREAN */
  function halDaftar(el) {
    const st = { poli: '', status: 'aktif', q: '', data: null };
    el.innerHTML = `
      <div class="page-h"><div><h1 class="h-xl">${ik('how_to_reg', 's28 teal')} Pendaftaran &amp; Antrean</h1><p>Antrean hari ini — ${esc(F.tglPanjang())}. Tekan <b>Panggil</b> untuk membacakan nomor di layar TV.</p></div>
        <div class="row wrap"><a class="btn secondary" href="display.html" target="_blank" rel="noopener">${ik('tv', 's18 teal')} Layar TV</a><a class="btn primary" href="#/pendaftaran/baru">${ik('person_add', 's18')} Daftarkan Pasien</a></div></div>
      <div class="grid g4 mb-md" id="pd-poli"></div>
      <div class="card pad-0">
        <div class="row between wrap" style="padding:1rem 1.25rem;gap:.75rem">
          <div class="pills" id="pd-status"></div>
          <div class="row wrap"><div class="inp-wrap" style="width:240px">${ik('filter_list')}<input class="inp" id="pd-q" placeholder="Saring nama / nomor…" aria-label="Saring antrean"></div><button class="btn icon secondary" id="pd-segar" title="Segarkan" aria-label="Segarkan">${ik('refresh')}</button></div>
        </div>
        <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>No.</th><th>Pasien</th><th>Poli</th><th>Jam</th><th>Status</th><th class="ta-r">Tindakan</th></tr></thead><tbody id="pd-body"><tr><td colspan="6">${UI.skel(4)}</td></tr></tbody></table></div>
      </div>`;
    const render = () => {
      const d = st.data; if (!d) return;
      const pm = App.poliMap();
      $('#pd-poli', el).innerHTML = App.poli().filter((p) => p.aktif).map((p) => {
        const x = d.perPoli[p.kode] || { menunggu: 0, aktif: 0, total: 0, selesai: 0 };
        const sedang = d.rows.find((k) => k.poli === p.kode && (k.status === 'Dipanggil' || k.status === 'Diperiksa'));
        return `<button class="card kpi" style="text-align:left;cursor:pointer;${st.poli === p.kode ? 'border-color:var(--primary);box-shadow:0 0 0 3px rgba(31,111,107,.12)' : ''}" data-poli="${esc(p.kode)}"><div class="row between top"><div class="col"><span class="eyebrow">${esc(p.nama)}</span><span class="v" style="font-size:24px">${sedang ? esc(sedang.no_antrean) : '—'}</span></div><div class="ic">${ik(p.ikon || 'stethoscope', 's22')}</div></div><div class="foot"><span class="amber-t sb">${x.menunggu} menunggu</span><span>${x.total} total</span></div></button>`;
      }).join('');
      const filt = { aktif: (k) => ['Menunggu', 'Dipanggil', 'Diperiksa'].includes(k.status), selesai: (k) => ['Selesai Periksa', 'Selesai'].includes(k.status), batal: (k) => k.status === 'Batal', semua: () => true };
      const cnt = (f) => d.rows.filter((k) => (!st.poli || k.poli === st.poli) && filt[f](k)).length;
      $('#pd-status', el).innerHTML = [['aktif', 'Dalam Antrean'], ['selesai', 'Selesai'], ['batal', 'Batal'], ['semua', 'Semua']].map(([k, l]) => `<button class="pill ${st.status === k ? 'on' : ''}" data-st="${k}">${l} (${cnt(k)})</button>`).join('');
      const q = st.q.toLowerCase();
      const rows = d.rows.filter((k) => (!st.poli || k.poli === st.poli) && filt[st.status](k) && (!q || (k.nama_pasien + ' ' + k.no_antrean + ' ' + k.id_rm).toLowerCase().includes(q)));
      $('#pd-body', el).innerHTML = rows.length ? rows.map((k) => `<tr class="${k.status === 'Selesai' || k.status === 'Batal' ? 'done' : ''}">
        <td><span class="tag-no ${['Dipanggil', 'Diperiksa'].includes(k.status) ? 'aktif' : ''}">${esc(k.no_antrean)}</span></td>
        <td data-c="full"><div class="col" style="gap:0"><span class="nm">${esc(k.nama_pasien)}</span><span class="sub mono">${esc(k.id_rm)} • ${esc(k.umur)} • ${esc(k.penjamin)}${k.keluhan_awal ? ' • ' + esc(k.keluhan_awal.slice(0, 50)) : ''}</span></div></td>
        <td class="hide-m"><span class="lbl">${esc((pm[k.poli] || {}).nama || k.poli)}</span></td>
        <td class="mono muted hide-m">${esc(k.jam)}</td>
        <td>${k.status === 'Menunggu' ? `<span class="badge warn"><span class="dot"></span>Menunggu (Urutan ${k.posisi})</span>` : UI.badgeStatus(k.status)}${k.prioritas !== 'Normal' ? ' ' + UI.badgeStatus(k.prioritas) : ''}${k.jumlah_panggil ? ` <span class="t-xs muted">${k.jumlah_panggil}× dipanggil</span>` : ''}</td>
        <td class="aksi-c"><div class="aksi">
          ${['Menunggu', 'Dipanggil'].includes(k.status) ? `<button class="btn sm ${k.status === 'Menunggu' ? 'soft' : 'secondary'}" data-panggil="${esc(k.id_kunjungan)}">${ik('campaign', 's16')} ${k.status === 'Dipanggil' ? 'Panggil Ulang' : 'Panggil'}</button>` : ''}
          ${k.status === 'Dipanggil' ? `<button class="btn sm ghost" data-ubah="Menunggu" data-id="${esc(k.id_kunjungan)}" title="Kembalikan ke antrean (pasien belum datang)">${ik('undo', 's16')}</button>` : ''}
          ${k.status !== 'Batal' ? `<button class="btn sm ghost" data-cetak="${esc(k.id_kunjungan)}" title="Cetak ulang tiket">${ik('print', 's16')}</button>` : ''}
          ${['Menunggu', 'Dipanggil'].includes(k.status) ? `<button class="btn sm ghost" data-ubah="Batal" data-id="${esc(k.id_kunjungan)}" title="Batalkan">${ik('cancel', 's16')}</button>` : ''}
        </div></td></tr>`).join('') : `<tr><td colspan="6">${UI.kosong(d.rows.length ? 'Tidak ada antrean pada filter ini' : 'Belum ada pasien terdaftar hari ini', 'event_available')}</td></tr>`;
    };
    const muat = (paksa) => swr('antrean', 'antrean.hariIni', {}, (d, c, err) => { if (err) { $('#pd-body', el).innerHTML = `<tr><td colspan="6"><div class="note danger">${esc(err.message)}</div></td></tr>`; return; } st.data = d; render(); }, { maxAge: 8000, phi: true, paksa });
    muat();
    App.setPoll(() => muat(false), 15000, 60000);
    $('#pd-q', el).addEventListener('input', S.debounce((e) => { st.q = e.target.value.trim(); render(); }, 150));
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.poli !== undefined) { st.poli = st.poli === t.dataset.poli ? '' : t.dataset.poli; render(); }
      if (t.dataset.st) { st.status = t.dataset.st; render(); }
      if (t.id === 'pd-segar') UI.sibuk(t, () => muat(true));
      if (t.dataset.panggil) { if (await App.panggil(t.dataset.panggil, 'POLI', t)) muat(true); }
      if (t.dataset.cetak) { const k = st.data.rows.find((x) => x.id_kunjungan === t.dataset.cetak); if (k) App.cetakTiket(k, null); }
      if (t.dataset.ubah) {
        const k = st.data.rows.find((x) => x.id_kunjungan === t.dataset.id), batal = t.dataset.ubah === 'Batal';
        if (!(await UI.konfirmasi(batal ? `Batalkan antrean ${k.no_antrean} (${k.nama_pasien})?` : `Kembalikan ${k.no_antrean} ke daftar tunggu?`, { bahaya: batal, ok: batal ? 'Batalkan antrean' : 'Kembalikan' }))) return;
        const r = await api('antrean.status', { id_kunjungan: k.id_kunjungan, status: t.dataset.ubah });
        UI.toast(r.success ? r.message : 'Gagal', r.success ? '' : r.message, r.success ? '' : 'err'); if (r.success) muat(true);
      }
    });
  }

  /* ===================================================== FORM PENDAFTARAN */
  function halForm(el, params) {
    const f = { mode: 'baru', pasien: null, jk: 'L', prioritas: 'Normal', info: null, simpan: false };
    const poliAktif = App.poli().filter((p) => p.aktif);
    el.innerHTML = `
      <div style="max-width:960px;margin:0 auto">
        <div class="row between wrap"><a class="crumb" href="#/pendaftaran">${ik('arrow_back', 's18')} Kembali ke Antrean</a>
          <span class="badge lg"><span class="dot pulse" style="background:var(--ok)"></span>Loket Pendaftaran Aktif <span class="mono muted">| ${esc(Sesi.me.nama)}</span></span></div>
        <div class="page-h"><div><h1 class="h-xl">${ik('person_add', 's28 teal')} Pendaftaran Pasien &amp; Cetak Antrean</h1><p>Masukkan data sesuai KTP/NIK untuk sinkronisasi rekam medis dan penerbitan nomor antrean otomatis.</p></div></div>
        <div class="seg mb-md" role="tablist"><button type="button" class="on" data-mode="baru">${ik('how_to_reg', 's18')} Pasien Baru</button><button type="button" data-mode="lama">${ik('history_toggle_off', 's18')} Pasien Lama (Cari NIK / No. RM)</button></div>
        <div id="cari-lama" class="card mb-md" hidden>
          <div class="field"><label for="q-lama">Cari pasien terdaftar</label><div class="ac"><div class="inp-wrap">${ik('search')}<input class="inp" id="q-lama" placeholder="Ketik NIK, No. RM, nama, atau No. HP…" autocomplete="off"></div><div class="ac-pop" id="q-pop" hidden></div></div><span class="hint">Pilih pasien untuk mengisi formulir otomatis. Data yang diubah ikut diperbarui.</span></div>
        </div>
        <form id="f-daftar" class="stack lg" novalidate>
          <section class="card stack">
            <div class="row between"><span class="eyebrow">1. Data Pasien (sesuai KTP)</span><span class="lbl-sm teal row gap-xs">${ik('verified_user', 's16')} Data tersimpan aman</span></div><div class="hr"></div>
            <div class="grid g2">
              <div class="field"><label for="nik"><span>Nomor Induk Kependudukan (NIK) <span class="req">*</span></span><span class="mono muted" id="nik-n">0/16</span></label><div class="inp-wrap"><input class="inp mono" id="nik" inputmode="numeric" maxlength="16" placeholder="3271012304920005" autocomplete="off"><span class="suf" id="nik-ok" hidden>${ik('check_circle', 'fill', '')}</span></div><label class="chk"><input type="checkbox" id="tanpa-nik"> Belum punya NIK (bayi / WNA)</label></div>
              <div class="field"><label><span>No. Rekam Medis</span><span class="lbl-sm teal" id="rm-lbl">Dibuat otomatis</span></label><div class="inp-wrap"><input class="inp mono ro" id="rm" readonly value="(otomatis saat disimpan)" tabindex="-1"><span class="suf">${ik('lock', 's18')}</span></div></div>
            </div>
            <div class="grid g2">
              <div class="field"><label for="nama">Nama Lengkap Pasien <span class="req">*</span></label><input class="inp" id="nama" placeholder="Contoh: Muhammad Farhan Pratama" autocomplete="off"></div>
              <div class="field"><label for="tgl"><span>Tanggal Lahir <span class="req">*</span></span><span class="badge teal" id="usia">Usia: -</span></label><input class="inp mono" id="tgl" type="date" max="${F.iso()}"></div>
            </div>
            <div class="grid g3">
              <div class="field"><span class="flabel">Jenis Kelamin <span class="req">*</span></span><div class="grid g2 keep" style="gap:.5rem"><button type="button" class="opt on" data-jk="L" style="justify-content:center">${ik('male', 's18')} Laki-laki</button><button type="button" class="opt" data-jk="P" style="justify-content:center">${ik('female', 's18')} Perempuan</button></div></div>
              <div class="field"><label for="hp">No. HP / WhatsApp</label><div class="inp-wrap"><span class="pre">+62</span><input class="inp mono" id="hp" type="tel" inputmode="tel" placeholder="812-3456-7890" autocomplete="off"></div></div>
              <div class="field"><label for="penjamin">Penjamin Pasien <span class="req">*</span></label><select class="sel" id="penjamin"><option value="Umum">Umum / Mandiri</option><option value="BPJS">BPJS Kesehatan (JKN)</option><option value="Asuransi">Asuransi Swasta / Inhealth</option></select></div>
            </div>
            <div class="field" id="f-nojkn" hidden><label for="nojkn">No. Kartu BPJS / Polis Asuransi</label><input class="inp mono" id="nojkn" inputmode="numeric" placeholder="0001234567890" autocomplete="off"></div>
            <div class="field"><label for="alamat">Alamat Tinggal Lengkap (Domisili)</label><textarea class="ta" id="alamat" rows="2" placeholder="Jl. Anggrek No. 14, RT 03/RW 08, Kel. Sukamaju, Kota Bogor"></textarea></div>
            <details><summary class="lbl teal" style="cursor:pointer">Data tambahan (golongan darah, alergi, wali)</summary>
              <div class="grid g3 mt-md"><div class="field"><label for="goldar">Golongan Darah</label><select class="sel" id="goldar"><option value="">-</option>${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => `<option>${g}</option>`).join('')}</select></div>
              <div class="field" style="grid-column:span 2"><label for="alergi">Riwayat Alergi Obat / Makanan</label><input class="inp" id="alergi" placeholder="Contoh: Penisilin (gatal-gatal)" autocomplete="off"></div></div>
              <div class="field mt-md"><label for="wali">Nama Wali / Penanggung Jawab (untuk anak)</label><input class="inp" id="wali" placeholder="Ny. Ratna Dewi (Ibu) — 0812…" autocomplete="off"></div>
            </details>
          </section>
          <section class="card stack">
            <div class="row between wrap"><span class="eyebrow">2. Tujuan Kunjungan &amp; Poliklinik</span><span class="t-sm muted">Jadwal praktik: <b class="ink" id="jadwal">-</b></span></div><div class="hr"></div>
            <div class="grid g2">
              <div class="field"><label for="poli">Poliklinik Tujuan <span class="req">*</span></label><select class="sel" id="poli">${poliAktif.map((p) => `<option value="${esc(p.kode)}">${esc(p.nama)}</option>`).join('')}</select></div>
              <div class="field"><label>Dokter Praktik Hari Ini</label><div class="inp-wrap"><input class="inp ro sb" id="dokter" readonly tabindex="-1"><span class="suf" style="color:var(--ok)">${ik('check_circle', 'fill')}</span></div></div>
            </div>
            <div class="field"><label for="keluhan"><span>Keluhan Singkat / Catatan Triase Awal</span><span class="hint">Membantu prioritas panggilan dokter</span></label><textarea class="ta" id="keluhan" rows="2" placeholder="Batuk pilek sejak 3 hari disertai demam ringan (37,8°C)…"></textarea></div>
            <div class="field"><span class="flabel">Prioritas Pasien</span><div class="opt-grid g3">
              <button type="button" class="opt on" data-pr="Normal">${ik('sentiment_satisfied')}<span>Normal / Reguler<small>Sesuai nomor urut normal</small></span></button>
              <button type="button" class="opt" data-pr="Prioritas">${ik('elderly', 'amber-t')}<span>Lansia / Balita / Disabilitas<small>Prioritas jalur percepatan</small></span></button>
              <button type="button" class="opt" data-pr="Darurat">${ik('emergency', 'red')}<span>Gawat Darurat Triase<small>Langsung ke ruang tindakan</small></span></button></div></div>
          </section>
          <section class="card row between wrap gap-lg">
            <div class="row gap-md"><div style="width:64px;height:64px;border-radius:18px;background:var(--amber-fixed);display:flex;align-items:center;justify-content:center">${ik('confirmation_number', 's36')}</div>
              <div class="col"><span class="lbl-sm up" style="color:var(--amber-strong)">Nomor Antrean Siap Cetak</span><div class="row"><span class="h-xl" id="pv-no">-</span><span class="badge ok" id="pv-slot">Slot tersedia</span></div><span class="t-sm muted" id="pv-ruang"></span></div></div>
            <div class="row gap-lg panel" style="padding:.9rem 1.25rem"><div class="col"><span class="lbl-sm muted">Estimasi Waktu Tunggu</span><span class="h-md" id="pv-est">-</span></div><span style="width:1px;height:32px;background:var(--c-high)"></span><div class="col"><span class="lbl-sm muted">Sisa Antrean di Depan</span><span class="h-md teal" id="pv-sisa">-</span></div></div>
          </section>
          <div class="sticky-bar">
            <div class="row"><button type="button" class="btn ghost" id="reset">${ik('restart_alt', 's18')} Reset Form</button><a class="btn hide-m" href="#/pendaftaran">Batal</a></div>
            <div class="row"><span class="t-sm muted row gap-xs hide-m" id="printer-info">${ik('print', 's18 teal')} Tiket thermal 58/80 mm</span><button class="btn primary lg" type="submit" id="simpan" data-sibuk="Menyimpan…">${ik('print', 's18')} Simpan &amp; Buat Nomor Antrean</button></div>
          </div>
        </form>
      </div>`;
    const v = (id) => $('#' + id, el);
    const setNik = () => { const s = v('nik').value.replace(/\D/g, ''); v('nik').value = s; v('nik-n').textContent = s.length + '/16'; v('nik-ok').hidden = s.length !== 16; v('nik-n').className = 'mono ' + (s.length === 16 ? 'green b' : 'muted'); };
    const setUsia = () => { v('usia').textContent = 'Usia: ' + (F.umur(v('tgl').value) || '-'); };
    const setJk = (j) => { f.jk = j; $$('[data-jk]', el).forEach((b) => b.classList.toggle('on', b.dataset.jk === j)); };
    const setPr = (p) => { f.prioritas = p; $$('[data-pr]', el).forEach((b) => b.classList.toggle('on', b.dataset.pr === p)); };
    const setPenjamin = () => { v('f-nojkn').hidden = v('penjamin').value === 'Umum'; };
    const infoPoli = async () => {
      const p = App.poliMap()[v('poli').value]; if (!p) return;
      v('dokter').value = (p.dokter_nama || 'Dokter jaga') + ' (Jadwal Tersedia)';
      v('jadwal').textContent = `${p.jam_mulai || '-'} - ${p.jam_selesai || '-'}`;
      v('pv-ruang').textContent = `${p.nama} • ${p.ruang || ''}`;
      v('pv-no').textContent = '…';
      const r = await api('antrean.info', { poli: p.kode });
      if (r.success && v('poli').value === p.kode) { f.info = r.data; v('pv-no').textContent = r.data.nomor_berikut; v('pv-est').textContent = '~' + r.data.estimasi_menit + ' Menit'; v('pv-sisa').textContent = r.data.sisa + ' Pasien'; }
    };
    const isiPasien = (p) => {
      f.pasien = p; v('rm').value = p.id_rm; v('rm-lbl').textContent = 'Pasien lama';
      v('nik').value = p.nik || ''; v('tanpa-nik').checked = !p.nik; setNik();
      v('nama').value = p.nama || ''; v('tgl').value = p.tgl_lahir || ''; setUsia(); setJk(p.jk || 'L');
      v('hp').value = String(p.no_hp || '').replace(/^0/, ''); v('penjamin').value = ['BPJS', 'Asuransi'].includes(p.penjamin) ? p.penjamin : 'Umum'; setPenjamin();
      v('nojkn').value = p.no_penjamin || ''; v('alamat').value = p.alamat || ''; v('goldar').value = p.gol_darah || ''; v('alergi').value = p.alergi || ''; v('wali').value = p.wali || '';
      if (p.alergi) UI.toast('Perhatian: pasien memiliki riwayat alergi', p.alergi, 'warn');
    };
    const kosongkan = () => { $('#f-daftar', el).reset(); f.pasien = null; v('rm').value = '(otomatis saat disimpan)'; v('rm-lbl').textContent = 'Dibuat otomatis'; setNik(); setUsia(); setJk('L'); setPr('Normal'); setPenjamin(); $$('.salah', el).forEach((x) => x.classList.remove('salah')); infoPoli(); };
    const setMode = (m) => { f.mode = m; $$('[data-mode]', el).forEach((b) => b.classList.toggle('on', b.dataset.mode === m)); v('cari-lama').hidden = m !== 'lama'; if (m === 'baru') kosongkan(); else setTimeout(() => v('q-lama').focus(), 30); };
    const muatPasien = async (rm) => { setMode('lama'); const r = await api('pasien.get', { id_rm: rm }); if (r.success) { isiPasien(r.data); v('q-lama').value = r.data.nama + ' — ' + r.data.id_rm; } else UI.toast('Pasien tidak ditemukan', r.message, 'err'); };

    v('nik').addEventListener('input', setNik); v('tgl').addEventListener('change', setUsia); v('penjamin').addEventListener('change', setPenjamin); v('poli').addEventListener('change', infoPoli);
    v('hp').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^\d\-\s]/g, ''); });
    v('tanpa-nik').addEventListener('change', (e) => { v('nik').disabled = e.target.checked; if (e.target.checked) { v('nik').value = ''; setNik(); } });
    // cari pasien lama
    let hasil = [];
    v('q-lama').addEventListener('input', S.debounce(async (e) => {
      const q = e.target.value.trim(), pop = v('q-pop'); if (q.length < 2) { pop.hidden = true; return; }
      const r = await api('pasien.cari', { q }); hasil = r.success ? r.data : [];
      pop.hidden = false; pop.innerHTML = hasil.length ? hasil.map((p, i) => `<button type="button" data-i="${i}"><span class="avatar">${esc(F.inisial(p.nama))}</span><span class="col grow" style="gap:0"><b>${esc(p.nama)}</b><span class="t-xs muted mono">${esc(p.id_rm)} • NIK ${esc(p.nik || '-')} • ${esc(p.umur)} • ${esc(p.penjamin)}</span></span></button>`).join('') : '<div class="t-sm muted" style="padding:10px">Tidak ditemukan. Gunakan tab Pasien Baru.</div>';
    }, 280));
    v('q-pop').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; v('q-pop').hidden = true; muatPasien(hasil[+b.dataset.i].id_rm); });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.mode) setMode(t.dataset.mode);
      if (t.dataset.jk) setJk(t.dataset.jk);
      if (t.dataset.pr) setPr(t.dataset.pr);
      if (t.id === 'reset') kosongkan();
    });
    $('#f-daftar', el).addEventListener('submit', async (e) => {
      e.preventDefault();
      $$('.salah', el).forEach((x) => x.classList.remove('salah'));
      const tanpaNik = v('tanpa-nik').checked, nik = v('nik').value.trim();
      const err = [];
      if (!tanpaNik && nik.length !== 16) err.push(['nik', 'NIK harus 16 digit']);
      if (v('nama').value.trim().length < 3) err.push(['nama', 'Nama minimal 3 huruf']);
      if (!v('tgl').value) err.push(['tgl', 'Tanggal lahir wajib diisi']);
      if (!v('poli').value) err.push(['poli', 'Pilih poli']);
      if (err.length) { err.forEach(([id]) => v(id).classList.add('salah')); v(err[0][0]).focus(); return UI.toast('Periksa formulir', err.map((x) => x[1]).join(' • '), 'err'); }
      const pasien = { id_rm: f.pasien ? f.pasien.id_rm : '', nik, tanpa_nik: tanpaNik, nama: v('nama').value.trim(), tgl_lahir: v('tgl').value, jk: f.jk, no_hp: v('hp').value ? '0' + v('hp').value.replace(/\D/g, '').replace(/^0/, '') : '', penjamin: v('penjamin').value, no_penjamin: v('nojkn').value.trim(), alamat: v('alamat').value.trim(), gol_darah: v('goldar').value, alergi: v('alergi').value.trim(), wali: v('wali').value.trim() };
      await UI.sibuk(v('simpan'), async () => {
        const r = await api('antrean.daftar', { pasien, poli: v('poli').value, keluhan: v('keluhan').value.trim(), prioritas: f.prioritas });
        if (!r.success) {
          if (r.code === 'NIK_TERDAFTAR' && r.data) {
            if (await UI.konfirmasi(r.message + ' Pakai data pasien lama tersebut?', { judul: 'NIK sudah terdaftar', ok: 'Gunakan data lama' })) muatPasien(r.data.id_rm);
            return;
          }
          return UI.toast('Gagal mendaftarkan', r.message, 'err');
        }
        S.Store.del('antrean'); S.Store.del('dash');
        sukses(r.data);
      });
    });
    function sukses(d) {
      const k = d.kunjungan, poli = App.poliMap()[k.poli] || {};
      const m = UI.modal({ judul: 'Nomor Antrean Diterbitkan', lebar: 'sm', isi: `<div class="ticket-ok"><div class="ic">${ik('check_circle', 's36')}</div>
        <div><div class="lbl-sm up muted">Nomor antrean</div><div class="bignum teal" style="font-size:44px;line-height:52px">${esc(k.no_antrean)}</div><p class="t-sm muted">Masuk ke antrean ${esc(poli.nama || k.poli)}${d.tiket.sisa ? ` • ${d.tiket.sisa} pasien di depan` : ' • langsung berikutnya'}</p></div>
        <div class="kv"><div><span>Pasien</span><span>${esc(d.pasien.nama)}</span></div><div><span>No. RM</span><span class="mono">${esc(d.pasien.id_rm)}</span></div><div><span>Poli tujuan</span><span>${esc(poli.nama || '')} • ${esc(poli.ruang || '')}</span></div><div><span>Penjamin</span><span>${esc(d.pasien.penjamin)}</span></div><div><span>Perkiraan tunggu</span><span>± ${esc(d.tiket.estimasi_menit)} menit</span></div></div></div>`,
        aksi: [{ label: 'Daftar Pasien Lagi', kelas: 'secondary', onClick: () => { setMode('baru'); } }, { label: 'Kembali ke Antrean', kelas: 'secondary', onClick: () => Router.go('/pendaftaran') }, { label: 'Cetak Tiket', ikon: 'print', kelas: 'primary', onClick: () => { App.cetakTiket(k, d.tiket, { setelahSimpan: true, onBaru: () => setMode('baru') }); } }] });
      return m;
    }
    setPenjamin(); infoPoli();
    if (params.rm) muatPasien(params.rm);
    App.struk().catch(() => { });   // muat modul cetak di latar belakang agar tiket langsung tampil
  }

  App.halaman.pendaftaran = {
    render(el, seg, params) { if (seg[0] === 'baru') halForm(el, params || {}); else halDaftar(el); }
  };
})();
