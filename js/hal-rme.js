/* SIMRS Mini — Pemeriksaan (RME) & E-Resep (Dokter, Admin) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, swr, UI, Router, Sesi, Berkas } = S;
  const SIN_ALERGI = { amoksisilin: ['amoxicillin', 'amoksisilin'], amoxicillin: ['amoxicillin', 'amoksisilin'], penisilin: ['penisilin', 'penicillin', 'amoxicillin', 'ampisilin', 'ampicillin'], 'beta-laktam': ['beta-laktam', 'penisilin', 'sefalosporin', 'cef'], sefalosporin: ['sefalosporin', 'cef'], sulfa: ['sulfa', 'kotrimoksazol', 'cotrimoxazole'], nsaid: ['ibuprofen', 'asam mefenamat', 'diklofenak'], aspirin: ['aspirin', 'asetosal'], paracetamol: ['paracetamol', 'parasetamol'], parasetamol: ['paracetamol', 'parasetamol'], ibuprofen: ['ibuprofen'] };
  const STOP = ['alergi', 'obat', 'riwayat', 'tidak', 'ada', 'pada', 'dengan', 'golongan', 'setelah', 'berat', 'ringan', 'gatal', 'urtikaria'];
  function cocokAlergi(alergi, o) {
    const kata = String(alergi || '').toLowerCase().split(/[^a-z\-]+/).filter((w) => w.length >= 4 && STOP.indexOf(w) < 0);
    const teks = (o.nama + ' ' + (o.kategori || '')).toLowerCase();
    return kata.find((w) => (SIN_ALERGI[w] || [w]).some((c) => teks.indexOf(c) >= 0)) || '';
  }
  const ATURAN = ['3 x 1 tablet sesudah makan', '2 x 1 tablet sesudah makan', '1 x 1 tablet malam hari', '3 x 1 sendok takar (5 ml)', '3 x ½ sendok takar (2,5 ml)', '3 x 0,5 ml (drop)', 'Bila demam (prn), maks 4 x sehari', 'Nebulisasi 1 ampul', 'Dioleskan 2 x sehari', '1 sachet tiap BAB cair'];

  /* ===================================================== DAFTAR PASIEN DOKTER */
  function halDaftar(el) {
    const me = Sesi.me, polis = App.poli().filter((p) => p.aktif && (!me.poli || !me.poli.length || me.poli.indexOf(p.kode) >= 0));
    const st = { poli: polis.length === 1 ? polis[0].kode : '', data: null };
    el.innerHTML = `
      <div class="page-h"><div><h1 class="h-xl">${ik('clinical_notes', 's28 teal')} Pemeriksaan (RME)</h1><p>Antrean hari ini — ${esc(polis.length > 2 ? polis.length + ' poli' : polis.map((p) => p.nama).join(' & ') || '-')}. Panggil pasien, lalu klik <b>Periksa</b> untuk mengisi rekam medis.</p></div>
        <div class="row"><button class="btn icon secondary" id="rm-segar" aria-label="Segarkan">${ik('refresh')}</button></div></div>
      <div class="card pad-0"><div class="row between wrap" style="padding:1rem 1.25rem"><div class="pills" id="rm-pills"></div><span class="t-sm muted" id="rm-ring"></span></div>
      <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>No.</th><th>Pasien</th><th>Keluhan Awal</th><th>Status</th><th class="ta-r">Tindakan</th></tr></thead><tbody id="rm-body"><tr><td colspan="5">${UI.skel(4)}</td></tr></tbody></table></div></div>`;
    const render = () => {
      const d = st.data; if (!d) return;
      const kode = polis.map((p) => p.kode);
      const rows = d.rows.filter((k) => kode.indexOf(k.poli) >= 0 && (!st.poli || k.poli === st.poli) && k.status !== 'Batal');
      $('#rm-pills', el).innerHTML = (polis.length > 1 ? `<button class="pill ${!st.poli ? 'on' : ''}" data-poli="">Semua</button>` : '') + polis.map((p) => `<button class="pill ${st.poli === p.kode ? 'on' : ''}" data-poli="${esc(p.kode)}">${esc(p.nama)}</button>`).join('');
      $('#rm-ring', el).textContent = `${rows.filter((k) => k.status === 'Menunggu').length} menunggu • ${rows.filter((k) => ['Selesai Periksa', 'Selesai'].includes(k.status)).length} selesai`;
      $('#rm-body', el).innerHTML = rows.length ? rows.map((k) => `<tr class="${k.status === 'Selesai' ? 'done' : ''}">
        <td><span class="tag-no ${['Dipanggil', 'Diperiksa'].includes(k.status) ? 'aktif' : ''}">${esc(k.no_antrean)}</span></td>
        <td data-c="full"><div class="col" style="gap:0"><span class="nm">${esc(k.nama_pasien)}</span><span class="sub mono">${esc(k.id_rm)} • ${esc(k.umur)} (${esc(F.jk(k.jk))}) • ${esc(k.penjamin)}</span></div></td>
        <td class="t-sm hide-m" style="max-width:280px">${esc(k.keluhan_awal || '-')}</td>
        <td>${k.status === 'Menunggu' ? `<span class="badge warn"><span class="dot"></span>Menunggu (Urutan ${k.posisi})</span>` : UI.badgeStatus(k.status)}${k.prioritas !== 'Normal' ? ' ' + UI.badgeStatus(k.prioritas) : ''}</td>
        <td class="aksi-c"><div class="aksi">${['Menunggu', 'Dipanggil'].includes(k.status) ? `<button class="btn sm soft" data-panggil="${esc(k.id_kunjungan)}">${ik('campaign', 's16')} ${k.status === 'Dipanggil' ? 'Ulang' : 'Panggil'}</button>` : ''}
          <a class="btn sm ${k.status === 'Diperiksa' || k.status === 'Dipanggil' ? 'primary' : 'secondary'}" href="#/rme/${encodeURIComponent(k.id_kunjungan)}">${ik(['Selesai Periksa', 'Selesai'].includes(k.status) ? 'visibility' : 'edit_note', 's16')} ${['Selesai Periksa', 'Selesai'].includes(k.status) ? 'Lihat / Koreksi' : k.status === 'Diperiksa' ? 'Lanjutkan' : 'Periksa'}</a></div></td></tr>`).join('') : `<tr><td colspan="5">${UI.kosong('Belum ada pasien di poli Anda hari ini', 'event_available')}</td></tr>`;
    };
    const muat = (paksa) => swr('antrean', 'antrean.hariIni', {}, (d, c, err) => { if (err) { $('#rm-body', el).innerHTML = `<tr><td colspan="5"><div class="note danger">${esc(err.message)}</div></td></tr>`; return; } st.data = d; render(); }, { maxAge: 8000, phi: true, paksa });
    muat(); App.setPoll(() => muat(false), 15000, 60000);
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.poli !== undefined) { st.poli = t.dataset.poli; render(); }
      if (t.id === 'rm-segar') UI.sibuk(t, () => muat(true));
      if (t.dataset.panggil) { if (await App.panggil(t.dataset.panggil, 'POLI', t)) muat(true); }
    });
  }

  /* ===================================================== FORM RME */
  function halRme(el, id) {
    const s = { d: null, dx: [], tt: [], resep: [], alergi: '', kotor: false, terkunci: false, final: false, obat: [], waktuSimpan: '', timer: null, sedangSimpan: false };
    el.innerHTML = `<a class="crumb" href="#/rme">${ik('arrow_back', 's18')} Kembali ke daftar pasien</a><div id="rme">${UI.skel(6)}</div>`;
    swr('obat', 'obat.list', {}, (o) => { if (o) s.obat = o.filter((x) => x.aktif); }, { maxAge: 60000 });
    api('rme.buka', { id_kunjungan: id }).then((r) => {
      if (!r.success) { $('#rme', el).innerHTML = `<div class="note danger">${ik('error', 's18')} ${esc(r.message)}</div>`; return; }
      S.Store.del('antrean'); S.Store.del('dash');
      s.d = r.data; const rme = r.data.rme || {};
      s.final = rme.status === 'Final';
      s.dx = (rme.diagnosis || []).map((x) => ({ kode: x.kode, nama: x.nama, utama: !!x.utama }));
      s.tt = (rme.tindakan_tarif || []).map((x) => ({ kode: x.kode, nama: x.nama, harga: x.harga, qty: x.qty || 1 }));
      s.resep = (r.data.resep || []).map((x) => ({ kode_obat: x.kode_obat, nama_obat: x.nama_obat, satuan: x.satuan, aturan: x.aturan, keterangan: x.keterangan, jumlah: Number(x.jumlah) || 1, harga: Number(x.harga) || 0, status: x.status }));
      s.terkunci = (r.data.resep || []).some((x) => ['Disiapkan', 'Siap Diambil', 'Diserahkan'].includes(x.status));
      s.alergi = (r.data.pasien && r.data.pasien.alergi) || '';
      gambar();
    });

    function gambar() {
      const { kunjungan: k, pasien: p, rme, riwayat, lampiran, poli } = s.d, r = rme || {}, tv = r.tanda_vital || {};
      const bbLalu = riwayat.map((v) => Number(String((v.tanda_vital || {}).bb || '').replace(',', '.'))).filter((x) => x > 0).slice(0, 2).reverse();
      const tbLalu = (riwayat.find((v) => (v.tanda_vital || {}).tb) || {}).tanda_vital || {};
      $('#rme', el).innerHTML = `
      <div class="stack">
        <div class="card row between wrap gap-md">
          <div class="row gap-md" style="min-width:0"><div style="position:relative"><span class="avatar lg">${esc(F.inisial(p.nama))}</span><span style="position:absolute;right:0;bottom:0;width:13px;height:13px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 2px #fff"></span></div>
            <div class="col" style="min-width:0"><div class="row wrap"><span class="h-md">${esc(p.nama)}</span><span class="tag-no">${esc(p.id_rm)}</span>${UI.badgeStatus(s.final ? 'Selesai Periksa' : k.status)}${k.prioritas !== 'Normal' ? UI.badgeStatus(k.prioritas) : ''}</div>
              <div class="row wrap t-sm muted gap-sm"><span>${esc(F.jk(p.jk))}, ${esc(p.umur)} (${esc(F.tgl(p.tgl_lahir))})</span><span>•</span><span class="row gap-xs teal sb">${ik('verified', 's16')} ${esc(p.penjamin === 'BPJS' ? 'BPJS Kesehatan' : p.penjamin)}${p.no_penjamin ? ' (' + esc(p.no_penjamin) + ')' : ''}</span><span>•</span><span>Antrean: <b class="ink">${esc(k.no_antrean)}</b></span></div></div></div>
          <div class="row wrap">${s.alergi ? `<span class="badge danger lg">${ik('warning', 's16')} Alergi: ${esc(s.alergi.slice(0, 40))}</span>` : '<span class="badge lg">Tidak ada alergi tercatat</span>'}${p.gol_darah ? `<span class="badge lg"><span class="muted">GOL:</span> <b class="ink">${esc(p.gol_darah)}</b></span>` : ''}
            ${['Menunggu', 'Dipanggil', 'Diperiksa'].includes(k.status) ? `<button class="btn sm soft" id="b-panggil">${ik('campaign', 's16')} Panggil Ulang</button>` : ''}</div>
        </div>
        <div class="split-rme">
          <div class="stack">
            <div class="card stack">
              <div class="row between"><h3 class="sec-title">${ik('person', 'teal')} Ringkasan Medis Pasien</h3><span class="lbl-sm up muted">${esc(poli ? poli.nama : '')}</span></div>
              <div class="grid g2 keep panel" style="gap:.75rem">
                <div class="col"><span class="lbl-sm muted">Berat Terakhir</span><span class="mono sb">${bbLalu.length ? esc(bbLalu[bbLalu.length - 1]) + ' kg' : '-'}</span></div>
                <div class="col"><span class="lbl-sm muted">Tinggi Badan</span><span class="mono sb">${tbLalu.tb ? esc(tbLalu.tb) + ' cm' : '-'}</span></div>
                <div class="col"><span class="lbl-sm muted">Nama Wali / Ibu</span><span class="t-sm">${esc(p.wali || '-')}</span></div>
                <div class="col"><span class="lbl-sm muted">Alamat</span><span class="t-sm trunc">${esc(p.alamat || '-')}</span></div>
              </div>
              <div class="alert-box" id="box-alergi" style="${s.alergi ? '' : 'background:var(--c-low);color:var(--muted)'}"><div class="row between"><b class="row lbl">${ik('emergency', 's18')} ${s.alergi ? 'PERINGATAN ALERGI OBAT AKTIF' : 'Riwayat alergi'}</b><button class="link-btn" id="b-alergi" style="color:inherit">${ik('edit', 's16')} Ubah</button></div><span class="t-sm" id="t-alergi">${esc(s.alergi || 'Belum ada data alergi. Tanyakan & catat bila ada.')}</span></div>
              <div class="col"><div class="row between lbl-sm"><span class="muted">Tren Berat Badan (kunjungan terakhir)</span><span class="mono teal" id="tren-teks"></span></div><div class="minibars" id="tren-bb"></div></div>
            </div>
            <div class="card stack">
              <div class="row between"><h3 class="sec-title">${ik('history', 'teal')} Riwayat Kunjungan</h3><span class="badge">Total: ${riwayat.length}</span></div>
              ${App.riwayatHtml(riwayat.slice(0, 3))}
              <div class="grid g2 keep" style="gap:.5rem"><button class="btn secondary sm" id="b-riwayat">${ik('history', 's16')} Semua riwayat</button><button class="btn soft sm" id="b-pdf" data-sibuk="Membuat PDF…">${ik('picture_as_pdf', 's16')} Rekam Medis (PDF)</button></div>
            </div>
            <div class="card stack">
              <div class="row between"><h3 class="sec-title">${ik('attach_file', 'teal')} Lampiran Hasil Lab</h3><label class="btn sm secondary" style="cursor:pointer">${ik('upload', 's16')} Unggah<input type="file" id="f-lamp" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></label></div>
              <div id="lamp-list">${lampiran.length ? '' : '<p class="t-sm muted">Belum ada lampiran. PDF/JPG/PNG maks. 8 MB, disimpan di folder Drive privat.</p>'}</div>
            </div>
          </div>
          <div class="stack">
            <div class="card stack lg">
              <section class="stack sm">
                <div class="row between"><h3 class="sec-title"><span class="sec-no">S</span> Anamnesis (Subjektif)</h3><span class="lbl-sm muted">${p.umur && /Bln|^([0-9]|1[0-6]) Th/.test(p.umur) ? 'Alloanamnesis dengan wali' : 'Autoanamnesis'}</span></div>
                <div class="field"><label for="keluhan">Keluhan Utama <span class="req">*</span></label><textarea class="ta white" id="keluhan" rows="2" data-k>${esc(r.keluhan || k.keluhan_awal || '')}</textarea></div>
                <div class="grid g2"><div class="field"><label class="muted" for="rps">Riwayat Penyakit Sekarang (RPS)</label><textarea class="ta white" id="rps" rows="2" data-k>${esc(r.rps || '')}</textarea></div><div class="field"><label class="muted" for="rpd">Riwayat Penyakit Dahulu &amp; Keluarga</label><textarea class="ta white" id="rpd" rows="2" data-k>${esc(r.rpd || '')}</textarea></div></div>
              </section>
              <div class="hr"></div>
              <section class="stack sm">
                <div class="row between"><h3 class="sec-title"><span class="sec-no">O</span> Pemeriksaan Fisik &amp; Vital Signs</h3><span class="lbl-sm green row gap-xs"><span class="badge ok" style="padding:0;width:8px;height:8px"></span>Diukur ${esc(F.jam())} WIB</span></div>
                <div class="grid g4" id="vital">
                  ${[['td', 'Tekanan Darah', 'monitor_heart', 'mmHg', '110/70'], ['suhu', 'Suhu Tubuh', 'device_thermostat', '°C', '36.5'], ['nadi', 'Nadi (HR)', 'favorite', 'x/menit', '80'], ['rr', 'Napas (RR)', 'pulmonology', 'x/menit', '20'], ['spo2', 'SpO₂', 'spo2', '%', '98'], ['bb', 'Berat Badan', 'monitor_weight', 'kg', '60'], ['tb', 'Tinggi Badan', 'straighten', 'cm', '165'], ['gds', 'Gula Darah', 'bloodtype', 'mg/dL', '-']].map(([key, lbl, ic, sat, ph]) => `<div class="vital" data-v="${key}"><div class="vh"><span>${lbl}</span>${ik(ic, 's16')}</div><input id="v-${key}" inputmode="decimal" placeholder="${ph}" value="${esc(tv[key] || '')}" aria-label="${lbl}" data-k><span class="vu" id="vu-${key}">${sat}</span></div>`).join('')}
                </div>
                <div class="field"><label class="muted" for="fisik">Deskripsi Pemeriksaan Organ</label><textarea class="ta white" id="fisik" rows="3" data-k placeholder="Mata: CA -/-, SI -/-. THT: … Pulmo: … Cor: … Abdomen: …">${esc(r.pemeriksaan_fisik || '')}</textarea></div>
              </section>
              <div class="hr"></div>
              <section class="stack sm">
                <div class="row between"><h3 class="sec-title"><span class="sec-no">A</span> Diagnosis Medis (ICD-10)</h3><button class="link-btn" id="b-katalog">${ik('search', 's16')} Cari Katalog Penyakit</button></div>
                <div class="panel stack sm"><div class="row wrap" id="dx-chips"></div>
                  <div class="ac"><div class="inp-wrap">${ik('add_circle')}<input class="inp white" id="dx-q" placeholder="Ketik kode ICD-10 atau nama diagnosis untuk menambah…" autocomplete="off"></div><div class="ac-pop" id="dx-pop" hidden></div></div>
                  <span class="t-xs muted">Klik label diagnosis untuk menjadikannya diagnosis UTAMA.</span></div>
              </section>
              <div class="hr"></div>
              <section class="stack sm">
                <div class="row between"><h3 class="sec-title"><span class="sec-no">P</span> Tindakan Klinis &amp; E-Resep</h3><span class="badge teal">Integrasi Farmasi Aktif</span></div>
                <div class="field"><label class="muted" for="tindakan">Tindakan &amp; Edukasi Medis</label><textarea class="ta white" id="tindakan" rows="2" data-k placeholder="Edukasi hidrasi, istirahat cukup, kompres hangat…">${esc(r.tindakan || '')}</textarea></div>
                <div class="field"><span class="flabel muted">Tindakan berbayar (masuk tagihan)</span><div class="row wrap" id="tt-chips"></div>
                  <div class="row"><select class="sel white grow" id="tt-sel"><option value="">— Pilih tindakan —</option>${((App.boot && App.boot.tarif) || []).filter((t) => t.aktif && t.kategori !== 'ADMINISTRASI').map((t) => `<option value="${esc(t.kode)}">${esc(t.nama)} — ${esc(F.rp(t.harga))}</option>`).join('')}</select><button class="btn secondary" id="tt-add">${ik('add', 's18')} Tambah</button></div></div>
                <div class="panel stack sm" style="padding:1rem;border-radius:var(--r-lg)">
                  <div class="row between"><h4 class="row h-md">${ik('prescriptions', 'teal')} E-Resep Elektronik</h4><span class="t-xs muted">${(s.d.resep[0] && s.d.resep[0].id_resep) ? 'No. Resep: <b class="mono ink">' + esc(s.d.resep[0].id_resep) + '</b>' : 'No. resep dibuat saat disimpan'}</span></div>
                  ${s.terkunci ? `<div class="note">${ik('lock', 's18')}<span>Resep sudah diproses farmasi sehingga tidak dapat diubah dari sini. Hubungi farmasi bila perlu koreksi.</span></div>` : ''}
                  <div class="tbl-wrap" style="background:#fff;border-radius:var(--r)"><table class="tbl compact"><thead><tr><th>Nama Obat / Sediaan</th><th>Aturan Pakai &amp; Dosis</th><th class="ta-c">Jumlah</th><th class="ta-r">Aksi</th></tr></thead><tbody id="rx-body"></tbody></table></div>
                  ${s.terkunci ? '' : `<div class="ac"><div class="inp-wrap">${ik('add_circle')}<input class="inp white" id="rx-q" placeholder="+ Tambah obat dari formularium (ketik nama obat)…" autocomplete="off"></div><div class="ac-pop" id="rx-pop" hidden></div></div>`}
                  <datalist id="dl-aturan">${ATURAN.map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
                  <div class="field"><label class="row gap-xs" for="cat-farmasi">${ik('comment', 's16 muted')} Catatan Khusus untuk Apoteker / Petugas Farmasi</label><input class="inp white" id="cat-farmasi" data-k value="${esc(r.catatan_farmasi || '')}" placeholder="Diminum setelah makan. Edukasi sendok takar 5 ml…"></div>
                </div>
                ${r.rujukan ? `<div class="note">${ik('forward', 's18')}<span><b>Rujukan:</b> ${esc(r.rujukan)}</span></div>` : ''}
              </section>
            </div>
          </div>
        </div>
        <div class="sticky-bar">
          <div class="row t-sm muted gap-sm"><span class="row gap-xs" id="autosave">${ik('cloud_done', 's18 green')} ${s.final ? 'Pemeriksaan sudah final — perubahan disimpan sebagai koreksi' : 'Draft tersimpan otomatis tiap 45 detik'}</span><span class="hide-m">•</span><span class="hide-m">Pemeriksa: <b class="ink">${esc(Sesi.me.nama)}</b></span></div>
          <div class="row wrap"><button class="btn" id="b-draft" data-sibuk="Menyimpan…">${ik('save', 's18')} ${s.final ? 'Simpan Koreksi' : 'Simpan Draft'}</button><button class="btn hide-m" id="b-rujuk">${ik('forward', 's18')} Rujuk Pasien</button>
            ${s.final ? '' : `<button class="btn primary lg" id="b-final" data-sibuk="Mengirim…">${ik('check_circle', 's18')} Selesai &amp; Kirim ke Farmasi ${ik('arrow_forward', 's18')}</button>`}</div>
        </div>
      </div>`;
      gambarLampiran(); gambarDx(); gambarTt(); gambarResep(); cekVital(); trenBb(bbLalu);
      pasangEvent(bbLalu);
    }
    function trenBb(lalu) {
      const kini = Number(String($('#v-bb', el).value).replace(',', '.')) || 0, arr = lalu.concat(kini ? [kini] : []).slice(-3), max = Math.max(1, ...arr);
      $('#tren-bb', el).innerHTML = arr.length ? arr.map((v, i) => `<div class="${i === arr.length - 1 ? 'last' : ''}" style="height:${Math.max(30, (v / max) * 100)}%">${esc(v)}</div>`).join('') : '<span class="t-xs muted" style="align-self:center">Belum ada data berat badan</span>';
      $('#tren-teks', el).textContent = arr.map((v) => v + 'kg').join(' → ');
    }
    function cekVital() {
      const n = (k) => Number(String($('#v-' + k, el).value).replace(',', '.'));
      const set = (k, kelas, teks) => { const box = $(`[data-v="${k}"]`, el); box.classList.remove('alert', 'bahaya'); if (kelas) box.classList.add(kelas); $('#vu-' + k, el).textContent = teks; };
      const su = n('suhu'); set('suhu', su >= 39 ? 'bahaya' : su >= 37.5 ? 'alert' : '', su >= 39 ? '°C • HIPERPIREKSIA' : su >= 37.5 ? '°C • FEBRIS / DEMAM' : su && su < 35.5 ? '°C • hipotermia' : '°C');
      const td = String($('#v-td', el).value).split('/').map(Number); set('td', td[0] >= 180 ? 'bahaya' : td[0] >= 140 || td[1] >= 90 ? 'alert' : '', td[0] >= 180 ? 'mmHg • KRISIS' : td[0] >= 140 || td[1] >= 90 ? 'mmHg • hipertensi' : 'mmHg');
      const sp = n('spo2'); set('spo2', sp && sp < 90 ? 'bahaya' : sp && sp < 95 ? 'alert' : '', sp && sp < 95 ? '% • desaturasi' : '%');
      const nd = n('nadi'); set('nadi', nd > 120 ? 'bahaya' : nd > 100 ? 'alert' : '', nd > 100 ? 'x/menit • takikardi' : 'x/menit');
      const bb = n('bb'), tb = n('tb'); set('tb', '', bb && tb ? 'cm • IMT ' + (bb / Math.pow(tb / 100, 2)).toFixed(1) : 'cm');
    }
    function gambarLampiran() {
      const L = s.d.lampiran; if (!L.length) return;
      $('#lamp-list', el).innerHTML = '<div class="stack sm">' + L.map((l) => `<div class="row between panel"><span class="row gap-sm" style="min-width:0">${ik(l.mime === 'application/pdf' ? 'picture_as_pdf' : 'image', 'teal')}<span class="col" style="gap:0;min-width:0"><span class="sb trunc">${esc(l.nama_file)}</span><span class="t-xs muted">${esc(F.relatif(l.waktu))} • ${Math.round(l.ukuran / 1024)} KB</span></span></span><button class="btn sm ghost" data-lamp="${esc(l.id)}">${ik('download', 's16')}</button></div>`).join('') + '</div>';
    }
    function gambarDx() {
      $('#dx-chips', el).innerHTML = s.dx.length ? s.dx.map((x, i) => `<span class="chip ${x.utama ? 'utama' : ''}"><span class="k">${x.utama ? 'UTAMA' : 'SEKUNDER'}</span><button type="button" data-utama="${i}" title="Jadikan diagnosis utama" style="opacity:1;font-weight:500"><b class="mono">${esc(x.kode)}</b>&nbsp;-&nbsp;${esc(x.nama)}</button><button type="button" data-hapusdx="${i}" aria-label="Hapus diagnosis">${ik('close', 's16')}</button></span>`).join('') : '<span class="t-sm muted">Belum ada diagnosis.</span>';
    }
    function gambarTt() {
      $('#tt-chips', el).innerHTML = s.tt.map((t, i) => `<span class="chip">${esc(t.nama)} <span class="mono t-xs">${t.qty > 1 ? t.qty + '× ' : ''}${esc(F.rp(t.harga))}</span><button type="button" data-qtytt="${i}" title="Ubah jumlah">${ik('edit', 's16')}</button><button type="button" data-hapustt="${i}" aria-label="Hapus">${ik('close', 's16')}</button></span>`).join('');
    }
    function gambarResep() {
      const om = {}; s.obat.forEach((o) => { om[o.kode] = o; });
      $('#rx-body', el).innerHTML = s.resep.length ? s.resep.map((x, i) => {
        const o = om[x.kode_obat] || {}, al = s.alergi && cocokAlergi(s.alergi, { nama: x.nama_obat, kategori: o.kategori || '' });
        return `<tr><td><div class="col" style="gap:0"><span class="nm" style="font-size:13px">${esc(x.nama_obat)}${al ? ` <span class="badge danger" title="Cocok dengan riwayat alergi">${ik('warning', 's16')} alergi</span>` : ''}</span><span class="sub">${esc(o.sediaan || '')}${o.kategori ? ' • ' + esc(o.kategori) : ''}${o.stok !== undefined ? ` • stok <b class="${o.stok < x.jumlah ? 'red' : ''}">${esc(o.stok)}</b>` : ''}</span></div></td>
          <td style="min-width:190px"><input class="inp white" style="height:36px;font-size:13px" list="dl-aturan" data-aturan="${i}" value="${esc(x.aturan)}" placeholder="3 x 1 sesudah makan" ${s.terkunci ? 'disabled' : ''}></td>
          <td class="ta-c" style="width:110px"><div class="row gap-xs" style="justify-content:center"><input class="inp white mono ta-c" style="height:36px;width:62px;padding:0 6px" type="number" min="1" data-jml="${i}" value="${esc(x.jumlah)}" ${s.terkunci ? 'disabled' : ''}><span class="t-xs muted">${esc(x.satuan)}</span></div></td>
          <td class="ta-r">${s.terkunci ? UI.badgeStatus(x.status) : `<button class="btn icon sm ghost" data-hapusrx="${i}" title="Hapus obat" aria-label="Hapus obat">${ik('delete', 's18')}</button>`}</td></tr>`;
      }).join('') : `<tr><td colspan="4"><span class="t-sm muted">Belum ada obat. Ketik nama obat di bawah untuk menambah.</span></td></tr>`;
    }
    function kumpul() {
      const g = (id) => ($('#' + id, el) ? $('#' + id, el).value.trim() : '');
      const tv = {}; ['td', 'suhu', 'nadi', 'rr', 'spo2', 'bb', 'tb', 'gds'].forEach((k) => { const v = g('v-' + k); if (v) tv[k] = v; });
      return { keluhan: g('keluhan'), rps: g('rps'), rpd: g('rpd'), tanda_vital: tv, pemeriksaan_fisik: g('fisik'), diagnosis: s.dx, tindakan: g('tindakan'), tindakan_tarif: s.tt.map((t) => ({ kode: t.kode, qty: t.qty })), catatan_farmasi: g('cat-farmasi'), rujukan: s.rujukan !== undefined ? s.rujukan : ((s.d.rme || {}).rujukan || '') };
    }
    function tandaiKotor() { if (!s.kotor) { s.kotor = true; const a = $('#autosave', el); if (a) a.innerHTML = ik('edit_note', 's18 amber-t') + ' Ada perubahan belum tersimpan'; } }
    async function simpan(final, diam) {
      if (s.sedangSimpan) return null;
      s.sedangSimpan = true;
      try {
        const payload = { id_kunjungan: id, rme: kumpul(), final: !!final, alergi: s.alergi };
        if (!s.terkunci) payload.resep = s.resep.map((x) => ({ kode_obat: x.kode_obat, jumlah: x.jumlah, aturan: x.aturan, keterangan: x.keterangan }));
        const r = await api('rme.simpan', payload);
        if (!r.success) { if (!diam || final) UI.toast('Gagal menyimpan', r.message, 'err'); return null; }
        s.kotor = false; s.waktuSimpan = F.jam();
        const a = $('#autosave', el); if (a) a.innerHTML = ik('cloud_done', 's18 green') + ` ${final ? 'Pemeriksaan selesai' : 'Draft tersimpan otomatis'} <span class="mono t-xs">(${s.waktuSimpan} WIB)</span>`;
        (r.data.peringatan || []).forEach((p) => UI.toast('Perhatian', p, 'warn'));
        S.Store.del('antrean'); S.Store.del('dash');
        return r;
      } finally { s.sedangSimpan = false; }
    }
    function tambahObat(o) {
      if (s.resep.some((x) => x.kode_obat === o.kode)) return UI.toast('Obat sudah ada di resep', o.nama, 'warn');
      const lanjut = () => { s.resep.push({ kode_obat: o.kode, nama_obat: o.nama, satuan: o.satuan, aturan: '', keterangan: '', jumlah: 1, harga: o.harga }); gambarResep(); tandaiKotor(); const a = $$('[data-aturan]', el).pop(); if (a) a.focus(); };
      const al = s.alergi && cocokAlergi(s.alergi, o);
      if (al) return UI.konfirmasi(`${o.nama} cocok dengan riwayat alergi pasien (“${s.alergi}”). Tetap tambahkan ke resep?`, { judul: '⚠ Peringatan Alergi', bahaya: true, ok: 'Tetap tambahkan' }).then((ya) => { if (ya) lanjut(); });
      if (o.stok <= 0) UI.toast('Stok habis', o.nama + ' stoknya 0 di farmasi.', 'warn');
      lanjut();
    }
    function pasangAc(inp, pop, cari, tampil, pilih) {
      let hasil = [], on = 0;
      const gambar = () => { pop.hidden = !hasil.length; pop.innerHTML = hasil.map((h, i) => `<button type="button" class="${i === on ? 'on' : ''}" data-i="${i}">${tampil(h)}</button>`).join(''); };
      inp.addEventListener('input', () => { hasil = cari(inp.value.trim().toLowerCase()); on = 0; gambar(); });
      inp.addEventListener('keydown', (e) => {
        if (pop.hidden) return;
        if (e.key === 'ArrowDown') { on = Math.min(hasil.length - 1, on + 1); gambar(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { on = Math.max(0, on - 1); gambar(); e.preventDefault(); }
        if (e.key === 'Enter') { e.preventDefault(); if (hasil[on]) { pilih(hasil[on]); inp.value = ''; pop.hidden = true; } }
        if (e.key === 'Escape') pop.hidden = true;
      });
      pop.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); pilih(hasil[+b.dataset.i]); inp.value = ''; pop.hidden = true; } });
      inp.addEventListener('blur', () => setTimeout(() => { pop.hidden = true; }, 150));
    }
    const cariIcd = (q) => { if (q.length < 2) return []; const L = (App.boot && App.boot.icd) || []; const a = L.filter((r) => r[0].toLowerCase().indexOf(q) === 0), b = L.filter((r) => r[0].toLowerCase().indexOf(q) !== 0 && (r[1] + ' ' + r[2]).toLowerCase().indexOf(q) >= 0); return a.concat(b).slice(0, 12); };
    const tambahDx = (r) => { if (s.dx.some((x) => x.kode === r[0])) return; s.dx.push({ kode: r[0], nama: r[1], utama: !s.dx.length }); gambarDx(); tandaiKotor(); };
    function pasangEvent(bbLalu) {
      $$('[data-k]', el).forEach((x) => x.addEventListener('input', tandaiKotor));
      $('#vital', el).addEventListener('input', () => { cekVital(); trenBb(bbLalu); });
      pasangAc($('#dx-q', el), $('#dx-pop', el), cariIcd, (r) => `<span class="kode">${esc(r[0])}</span><span class="col" style="gap:0"><span>${esc(r[1])}</span><span class="t-xs muted">${esc(r[2])}</span></span>`, tambahDx);
      if ($('#rx-q', el)) pasangAc($('#rx-q', el), $('#rx-pop', el), (q) => (q.length < 2 ? [] : s.obat.filter((o) => (o.nama + ' ' + o.kode + ' ' + o.kategori).toLowerCase().indexOf(q) >= 0).slice(0, 12)),
        (o) => `<span class="col grow" style="gap:0"><span class="sb">${esc(o.nama)}${s.alergi && cocokAlergi(s.alergi, o) ? ' <span class="badge danger">alergi</span>' : ''}</span><span class="t-xs muted">${esc(o.sediaan)} • ${esc(o.kategori)}</span></span><span class="col ta-r" style="gap:0"><span class="mono t-xs ${o.stok <= o.stok_min ? 'red b' : ''}">stok ${esc(o.stok)} ${esc(o.satuan)}</span><span class="mono t-xs muted">${esc(F.rp(o.harga))}</span></span>`, tambahObat);
      $('#rx-body', el).addEventListener('input', (e) => {
        const t = e.target;
        if (t.dataset.aturan !== undefined) { s.resep[+t.dataset.aturan].aturan = t.value; tandaiKotor(); }
        if (t.dataset.jml !== undefined) { s.resep[+t.dataset.jml].jumlah = Math.max(1, Number(t.value) || 1); tandaiKotor(); }
      });
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('button,label.btn'); if (!t) return;
        if (t.dataset.utama !== undefined) { s.dx.forEach((x, i) => { x.utama = i === +t.dataset.utama; }); gambarDx(); tandaiKotor(); }
        if (t.dataset.hapusdx !== undefined) { s.dx.splice(+t.dataset.hapusdx, 1); if (s.dx.length && !s.dx.some((x) => x.utama)) s.dx[0].utama = true; gambarDx(); tandaiKotor(); }
        if (t.dataset.hapustt !== undefined) { s.tt.splice(+t.dataset.hapustt, 1); gambarTt(); tandaiKotor(); }
        if (t.dataset.qtytt !== undefined) { const x = s.tt[+t.dataset.qtytt], q = await UI.tanya('Jumlah tindakan', x.nama, { tipe: 'number', nilai: String(x.qty) }); if (q) { x.qty = Math.max(1, Math.min(99, Number(q) || 1)); gambarTt(); tandaiKotor(); } }
        if (t.dataset.hapusrx !== undefined) { s.resep.splice(+t.dataset.hapusrx, 1); gambarResep(); tandaiKotor(); }
        if (t.dataset.lamp) { await UI.sibuk(t, async () => { const r = await api('lampiran.unduh', { id: t.dataset.lamp }); if (r.success) Berkas.unduhBase64(r.data.base64, r.data.nama, r.data.mime); else UI.toast('Gagal', r.message, 'err'); }); }
        switch (t.id) {
          case 'tt-add': { const kode = $('#tt-sel', el).value, tr = ((App.boot && App.boot.tarif) || []).find((x) => x.kode === kode); if (!tr) return; const ada = s.tt.find((x) => x.kode === kode); if (ada) ada.qty++; else s.tt.push({ kode, nama: tr.nama, harga: tr.harga, qty: 1 }); $('#tt-sel', el).value = ''; gambarTt(); tandaiKotor(); break; }
          case 'b-panggil': App.panggil(id, 'POLI', t); break;
          case 'b-riwayat': App.riwayatPasien(s.d.pasien.id_rm); break;
          case 'b-pdf': await UI.sibuk(t, async () => { const r = await api('rme.pdf', { id_rm: s.d.pasien.id_rm }); if (r.success) Berkas.unduhBase64(r.data.base64, r.data.nama, r.data.mime); else UI.toast('Gagal', r.message, 'err'); }); break;
          case 'b-alergi': { const v = await UI.tanya('Riwayat Alergi Pasien', 'Obat/makanan & reaksi (kosongkan bila tidak ada)', { area: true, nilai: s.alergi }); if (v !== null) { s.alergi = v; $('#t-alergi', el).textContent = v || 'Belum ada data alergi.'; tandaiKotor(); gambarResep(); UI.toast('Alergi diperbarui', 'Tersimpan saat RME disimpan.'); } break; }
          case 'b-katalog': katalog(); break;
          case 'b-draft': await UI.sibuk(t, async () => { const r = await simpan(false); if (r) UI.toast(s.final ? 'Koreksi tersimpan' : 'Draft tersimpan', r.message); }); break;
          case 'b-rujuk': { const v = await UI.tanya('Rujuk Pasien', 'Tujuan rujukan & alasan (mis. RSUD Cibinong — Poli Anak, curiga pneumonia)', { area: true, wajib: true, ok: 'Simpan rujukan', nilai: (s.d.rme || {}).rujukan || '' }); if (v) { s.rujukan = v; tandaiKotor(); UI.toast('Rujukan dicatat', 'Klik Selesai untuk menyelesaikan pemeriksaan.'); } break; }
          case 'b-final': {
            const d = kumpul(); if (!d.keluhan) { $('#keluhan', el).classList.add('salah'); $('#keluhan', el).focus(); return UI.toast('Keluhan utama wajib diisi', '', 'err'); }
            if (!s.dx.length) { $('#dx-q', el).focus(); return UI.toast('Tambahkan minimal satu diagnosis ICD-10', '', 'err'); }
            if (s.resep.some((x) => !x.aturan)) { if (!(await UI.konfirmasi('Ada obat tanpa aturan pakai. Tetap kirim ke farmasi?', { ok: 'Tetap kirim' }))) return; }
            if (!(await UI.konfirmasi(`Selesaikan pemeriksaan ${s.d.kunjungan.no_antrean} (${s.d.pasien.nama})${s.resep.length ? ' dan kirim ' + s.resep.length + ' obat ke farmasi' : ''}? Tagihan dibuat otomatis.`, { ok: 'Selesai & kirim' }))) return;
            await UI.sibuk(t, async () => { const r = await simpan(true); if (r) { UI.toast('Pemeriksaan selesai', r.message); App.jagaPerubahan(null); Router.go('/rme'); } });
            break;
          }
        }
      });
      $('#f-lamp', el).addEventListener('change', async (e) => {
        const f = e.target.files[0]; e.target.value = ''; if (!f) return;
        if (f.size > 8 * 1024 * 1024) return UI.toast('Berkas terlalu besar', 'Maksimal 8 MB.', 'err');
        const ket = await UI.tanya('Keterangan lampiran', 'Mis. Hasil darah lengkap', { ok: 'Unggah' }); if (ket === null) return;
        UI.toast('Mengunggah…', f.name);
        const r = await api('lampiran.unggah', { id_kunjungan: id, nama_file: f.name, mime: f.type, base64: await Berkas.keBase64(f), keterangan: ket }, { timeout: 120000 });
        if (!r.success) return UI.toast('Gagal mengunggah', r.message, 'err');
        s.d.lampiran.unshift(r.data); gambarLampiran(); UI.toast('Lampiran tersimpan', r.message);
      });
      App.jagaPerubahan(() => s.kotor);
      s.timer = setInterval(() => { if (s.kotor && !s.final && document.visibilityState === 'visible') simpan(false, true); }, 45000);
    }
    function katalog() {
      const m = UI.modal({ judul: 'Katalog Penyakit ICD-10', lebar: 'wide', isi: `<div class="inp-wrap mb-md">${ik('search')}<input class="inp white" id="kq" placeholder="Cari kode atau nama (mis. J06, demam, gastritis)…"></div><div id="kh" class="stack sm" style="max-height:55vh;overflow:auto"></div>`, aksi: [{ label: 'Selesai', kelas: 'primary' }] });
      const L = (App.boot && App.boot.icd) || [];
      const gambarK = (q) => { const h = q ? L.filter((r) => (r.join(' ')).toLowerCase().indexOf(q) >= 0) : L; $('#kh', m.el).innerHTML = h.slice(0, 200).map((r) => `<button class="qitem" data-k="${esc(r[0])}"><span class="mono b teal" style="min-width:56px">${esc(r[0])}</span><span class="col grow" style="gap:0"><span>${esc(r[1])}</span><span class="t-xs muted">${esc(r[2])}</span></span>${s.dx.some((x) => x.kode === r[0]) ? ik('check_circle', 'fill teal') : ik('add_circle', 'muted')}</button>`).join('') || UI.kosong('Tidak ditemukan. Admin dapat menambah kode di Kelola → ICD-10.', 'search_off'); };
      gambarK('');
      $('#kq', m.el).addEventListener('input', S.debounce((e) => gambarK(e.target.value.trim().toLowerCase()), 150));
      $('#kh', m.el).addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; const r = L.find((x) => x[0] === b.dataset.k); tambahDx(r); gambarK($('#kq', m.el).value.trim().toLowerCase()); });
    }
    return { keluar() { clearInterval(s.timer); if (s.kotor && s.d && !s.final) simpan(false, true); } };
  }

  App.halaman.rme = {
    _sub: null,
    render(el, seg) { this._sub = seg[0] ? halRme(el, decodeURIComponent(seg[0])) : (halDaftar(el), null); },
    keluar() { if (this._sub && this._sub.keluar) this._sub.keluar(); this._sub = null; }
  };
})();
