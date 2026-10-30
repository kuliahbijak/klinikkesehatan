/* SIMRS Mini — Kelola (Admin): pengguna, poli, obat, tarif, ICD-10, pengaturan,
   layar panggilan, struk & printer, keamanan, import data, log audit, sistem. */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, swr, UI, Router, Sesi, Berkas } = S;
  const TAB = [['pengguna', 'Pengguna', 'group'], ['poli', 'Poli & Jadwal', 'local_hospital'], ['obat', 'Obat', 'medication'], ['tarif', 'Tarif', 'sell'], ['icd', 'ICD-10', 'coronavirus'], ['klinik', 'Profil Klinik', 'apartment'], ['layar', 'Layar Panggilan', 'tv'], ['struk', 'Struk & Printer', 'print'], ['keamanan', 'Keamanan', 'shield_lock'], ['import', 'Import Data', 'upload_file'], ['audit', 'Log Audit', 'policy'], ['sistem', 'Sistem', 'monitor_heart']];
  const PERAN = [['ADMIN', 'Administrator'], ['PENDAFTARAN', 'Petugas Pendaftaran'], ['DOKTER', 'Dokter'], ['FARMASI', 'Farmasi'], ['KASIR', 'Kasir'], ['MANAJEMEN', 'Manajemen']];
  const IKON_POLI = ['stethoscope', 'child_care', 'dentistry', 'monitor_heart', 'pregnant_woman', 'visibility', 'hearing', 'psychology', 'vaccines', 'healing', 'emergency', 'medical_services'];

  /** Form modal generik. fields: [{k,label,tipe,opsi,wajib,hint,penuh,ro,min}] */
  function formModal(o) {
    const v = o.nilai || {};
    const inp = (f) => {
      const val = v[f.k] === undefined || v[f.k] === null ? (f.def !== undefined ? f.def : '') : v[f.k];
      if (f.tipe === 'select') return `<select class="sel white" id="fm-${f.k}">${f.opsi.map((x) => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(a)}" ${String(val) === String(a) ? 'selected' : ''}>${esc(b)}</option>`; }).join('')}</select>`;
      if (f.tipe === 'checkbox') return `<label class="chk"><input type="checkbox" id="fm-${f.k}" ${val === false || val === 'TIDAK' ? '' : 'checked'}> ${esc(f.cek || 'Aktif')}</label>`;
      if (f.tipe === 'multi') { const pilih = String(val || '').split(/[,;]\s*/); return `<div class="row wrap" id="fm-${f.k}">${f.opsi.map(([a, b]) => `<label class="chk"><input type="checkbox" value="${esc(a)}" ${pilih.includes(a) ? 'checked' : ''}> ${esc(b)}</label>`).join('')}</div>`; }
      if (f.tipe === 'textarea') return `<textarea class="ta white" id="fm-${f.k}" rows="3">${esc(val)}</textarea>`;
      return `<input class="inp white ${f.mono ? 'mono' : ''}" id="fm-${f.k}" type="${f.tipe || 'text'}" value="${esc(val)}" ${f.ro ? 'readonly' : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} placeholder="${esc(f.ph || '')}" autocomplete="off">`;
    };
    const m = UI.modal({ judul: o.judul, lebar: o.lebar, isi: `<form class="grid g2" onsubmit="return false">${o.fields.map((f) => `<div class="field" style="${f.penuh || f.tipe === 'textarea' || f.tipe === 'multi' ? 'grid-column:1/-1' : ''}" ${f.tampil === false ? 'hidden' : ''} data-f="${f.k}"><label for="fm-${f.k}">${esc(f.label)}${f.wajib ? ' <span class="req">*</span>' : ''}</label>${inp(f)}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`).join('')}</form>`,
      aksi: [{ label: 'Batal' }, { label: o.ok || 'Simpan', kelas: 'primary', onClick: async (t, b) => {
        const data = {}; let salah = false;
        o.fields.forEach((f) => {
          const x = $('#fm-' + f.k, m.el);
          if (f.tipe === 'checkbox') data[f.k] = x.checked;
          else if (f.tipe === 'multi') data[f.k] = $$('input:checked', x).map((i) => i.value).join(',');
          else if (f.tipe === 'number') data[f.k] = Number(x.value) || 0;
          else data[f.k] = x.value.trim();
          if (f.wajib && !data[f.k] && data[f.k] !== 0) { x.classList.add('salah'); salah = true; }
        });
        if (salah) { UI.toast('Lengkapi isian bertanda *', '', 'err'); return false; }
        const r = await UI.sibuk(b, () => o.simpan(data));
        if (!r || !r.success) { UI.toast('Gagal menyimpan', r ? r.message : '', 'err'); return false; }
        UI.toast(r.message || 'Tersimpan');
        if (o.selesai) o.selesai(r);
      } }] });
    if (o.siap) o.siap(m);
    return m;
  }
  function tabelSederhana(box, o) {
    box.innerHTML = `<div class="card pad-0"><div class="row between wrap" style="padding:1rem 1.25rem;gap:.75rem"><div class="inp-wrap" style="width:260px">${ik('search')}<input class="inp" placeholder="Cari…" data-q></div><div class="row">${o.tombol || ''}</div></div><div class="tbl-wrap"><table class="tbl cards"><thead><tr>${o.kolom.map((c) => `<th class="${c.kls || ''}">${esc(c.label)}</th>`).join('')}<th class="ta-r">Aksi</th></tr></thead><tbody data-b><tr><td colspan="${o.kolom.length + 1}">${UI.skel(4)}</td></tr></tbody></table></div></div>`;
    let rows = [], q = '';
    const gambar = () => { const f = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q)); $('[data-b]', box).innerHTML = f.length ? f.map((r, i) => `<tr>${o.kolom.map((c) => `<td class="${c.kls || ''}" ${c.full ? 'data-c="full"' : ''}>${c.isi(r)}</td>`).join('')}<td class="aksi-c"><div class="aksi"><button class="btn sm ghost" data-i="${rows.indexOf(r)}">${ik('edit', 's16')} Ubah</button></div></td></tr>`).join('') : `<tr><td colspan="${o.kolom.length + 1}">${UI.kosong('Belum ada data', 'inbox')}</td></tr>`; };
    $('[data-q]', box).addEventListener('input', S.debounce((e) => { q = e.target.value.trim().toLowerCase(); gambar(); }, 150));
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) o.ubah(rows[+b.dataset.i]); });
    return { set(r) { rows = r; gambar(); } };
  }
  const segarBoot = async () => { await App.muatBoot(true); };

  /* ----------------------------------------------------------- tab: pengguna */
  function tPengguna(box) {
    const formU = (u) => formModal({ judul: u ? 'Ubah Pengguna' : 'Tambah Pengguna', nilai: u ? Object.assign({}, u, { status_aktif: u.aktif }) : { status_aktif: true },
      fields: [{ k: 'email', label: 'Email akun Google', tipe: 'email', wajib: true, ro: !!u, penuh: true, hint: 'Pengguna masuk dengan akun Google ini.' }, { k: 'nama', label: 'Nama tampilan', wajib: true, ph: 'dr. Sarah Alamsyah, Sp.A' }, { k: 'peran', label: 'Peran', tipe: 'select', opsi: PERAN, def: 'PENDAFTARAN' },
        { k: 'poli', label: 'Poli yang ditangani (khusus dokter; kosong = semua)', tipe: 'multi', opsi: App.poli().map((p) => [p.kode, p.nama]) }, { k: 'sip', label: 'No. SIP (dokter/apoteker)', ph: '446/782/2021' }, { k: 'telepon', label: 'Telepon', tipe: 'tel' }, { k: 'status_aktif', label: 'Status', tipe: 'checkbox', cek: 'Akun aktif (boleh masuk)' }],
      simpan: (d) => api('pengguna.simpan', { pengguna: Object.assign(d, { status_aktif: d.status_aktif ? 'YA' : 'TIDAK' }) }), selesai: muat });
    const t = tabelSederhana(box, { tombol: `<button class="btn primary" data-baru>${ik('person_add', 's18')} Tambah Pengguna</button>`,
      kolom: [{ label: 'Pengguna', full: 1, isi: (u) => `<div class="row"><span class="avatar">${esc(F.inisial(u.nama))}</span><div class="col" style="gap:0"><span class="nm">${esc(u.nama)}</span><span class="sub">${esc(u.email)}</span></div></div>` }, { label: 'Peran', isi: (u) => `<span class="badge teal">${esc((PERAN.find((p) => p[0] === u.peran) || [, u.peran])[1])}</span>` }, { label: 'Poli', kls: 'hide-m', isi: (u) => esc(u.poli || '-') }, { label: 'Status', isi: (u) => (u.aktif ? '<span class="badge ok"><span class="dot"></span>Aktif</span>' : '<span class="badge danger"><span class="dot"></span>Nonaktif</span>') }],
      ubah: formU });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) formU(null); });
    async function muat() { const r = await api('pengguna.list', {}, { langsung: true }); if (r.success) t.set(r.data); }
    muat();
    box.insertAdjacentHTML('afterbegin', `<div class="note info mb-md">${ik('info', 's18')}<span>Hanya email yang terdaftar & aktif yang bisa masuk. Mengubah peran atau menonaktifkan akun langsung mengakhiri sesi orang tersebut.</span></div>`);
  }
  /* ----------------------------------------------------------- tab: poli */
  function tPoli(box) {
    const formP = (p) => formModal({ judul: p ? 'Ubah Poli ' + p.nama : 'Tambah Poli', lebar: 'wide', nilai: p || { aktif: true, ikon: 'stethoscope', urutan: App.poli().length + 1 },
      fields: [{ k: 'kode', label: 'Kode poli', wajib: true, ro: !!p, mono: 1, ph: 'UMUM' }, { k: 'nama', label: 'Nama poli', wajib: true, ph: 'Poli Umum' }, { k: 'kode_antrean', label: 'Huruf awalan nomor antrean', wajib: true, ph: 'A', hint: 'Nomor antrean menjadi A-001, A-002, …' }, { k: 'ruang', label: 'Ruang', ph: 'Ruang 01' },
        { k: 'dokter_nama', label: 'Nama dokter praktik', ph: 'dr. Budi Santoso' }, { k: 'dokter_email', label: 'Email dokter (opsional)', tipe: 'email' }, { k: 'jam_mulai', label: 'Jam mulai', tipe: 'time' }, { k: 'jam_selesai', label: 'Jam selesai', tipe: 'time' },
        { k: 'tarif_konsultasi', label: 'Tarif konsultasi (Rp)', tipe: 'number', min: 0 }, { k: 'ikon', label: 'Ikon', tipe: 'select', opsi: IKON_POLI }, { k: 'urutan', label: 'Urutan tampil', tipe: 'number', min: 0 }, { k: 'aktif', label: 'Status', tipe: 'checkbox', cek: 'Poli aktif (tampil di pendaftaran & layar TV)' },
        { k: 'petunjuk', label: 'Petunjuk arah (tampil di layar TV saat dipanggil)', tipe: 'textarea' }],
      simpan: (d) => api('poli.simpan', { poli: d }), selesai: async () => { await segarBoot(); muat(); } });
    const t = tabelSederhana(box, { tombol: `<button class="btn primary" data-baru>${ik('add', 's18')} Tambah Poli</button>`,
      kolom: [{ label: 'Poli', full: 1, isi: (p) => `<div class="row">${ik(p.ikon, 'teal')}<div class="col" style="gap:0"><span class="nm">${esc(p.nama)}</span><span class="sub">${esc(p.kode)} • ${esc(p.ruang)}</span></div></div>` }, { label: 'Awalan', isi: (p) => `<span class="tag-no">${esc(p.kode_antrean)}-001</span>` }, { label: 'Dokter & Jam', kls: 'hide-m', isi: (p) => `${esc(p.dokter_nama || '-')}<div class="sub mono">${esc(p.jam_mulai)} - ${esc(p.jam_selesai)}</div>` }, { label: 'Konsultasi', kls: 'num', isi: (p) => esc(F.rp(p.tarif_konsultasi)) }, { label: 'Status', isi: (p) => (p.aktif ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') }],
      ubah: formP });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) formP(null); });
    const muat = () => t.set(App.poli());
    muat();
  }
  /* ----------------------------------------------------------- tab: obat */
  function tObat(box) {
    const t = tabelSederhana(box, { tombol: `<button class="btn primary" data-baru>${ik('add', 's18')} Obat Baru</button><a class="btn secondary" href="#/farmasi?tab=stok">${ik('inventory_2', 's18 teal')} Mutasi stok</a>`,
      kolom: [{ label: 'Obat', full: 1, isi: (o) => `<div class="col" style="gap:0"><span class="nm">${esc(o.nama)}</span><span class="sub mono">${esc(o.kode)} • ${esc(o.sediaan)}</span></div>` }, { label: 'Kategori', kls: 'hide-m', isi: (o) => esc(o.kategori) }, { label: 'Harga', kls: 'num', isi: (o) => esc(F.rp(o.harga)) }, { label: 'Stok', kls: 'num', isi: (o) => `<span class="badge ${o.stok <= o.stok_min ? 'warn' : 'ok'}">${esc(o.stok)} ${esc(o.satuan)}</span>` }, { label: 'Status', isi: (o) => (o.aktif ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') }],
      ubah: (o) => App.formObat(o, () => muat(true)) });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) App.formObat(null, () => muat(true)); });
    const muat = (paksa) => swr('obat', 'obat.list', {}, (d) => { if (d) t.set(d); }, { maxAge: 20000, paksa });
    muat(false);
  }
  /* ----------------------------------------------------------- tab: tarif */
  function tTarif(box) {
    const formT = (x) => formModal({ judul: x ? 'Ubah Tarif' : 'Tambah Tarif', nilai: x || { aktif: true, kategori: 'TINDAKAN' },
      fields: [{ k: 'kode', label: 'Kode', ro: !!x, mono: 1, ph: 'Otomatis bila kosong' }, { k: 'nama', label: 'Nama tindakan / biaya', wajib: true }, { k: 'kategori', label: 'Kategori', tipe: 'select', opsi: [['TINDAKAN', 'Tindakan (dipilih dokter)'], ['ADMINISTRASI', 'Administrasi (otomatis di setiap tagihan)'], ['LAIN', 'Lain-lain (dipilih dokter)']] }, { k: 'harga', label: 'Harga (Rp)', tipe: 'number', min: 0 }, { k: 'aktif', label: 'Status', tipe: 'checkbox', cek: 'Tarif aktif' }],
      simpan: (d) => api('tarif.simpan', { tarif: d }), selesai: async () => { await segarBoot(); muat(); } });
    const t = tabelSederhana(box, { tombol: `<button class="btn primary" data-baru>${ik('add', 's18')} Tambah Tarif</button>`,
      kolom: [{ label: 'Kode', isi: (x) => `<span class="mono">${esc(x.kode)}</span>` }, { label: 'Nama', full: 1, isi: (x) => `<span class="nm">${esc(x.nama)}</span>` }, { label: 'Kategori', isi: (x) => `<span class="badge ${x.kategori === 'ADMINISTRASI' ? 'info' : ''}">${esc(x.kategori)}</span>` }, { label: 'Harga', kls: 'num', isi: (x) => esc(F.rp(x.harga)) }, { label: 'Status', isi: (x) => (x.aktif ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') }],
      ubah: formT });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) formT(null); });
    const muat = () => t.set((App.boot && App.boot.tarif) || []);
    muat();
    box.insertAdjacentHTML('afterbegin', `<div class="note info mb-md">${ik('info', 's18')}<span>Tarif <b>Administrasi</b> otomatis masuk ke setiap tagihan. Tarif konsultasi diatur per poli di tab Poli &amp; Jadwal.</span></div>`);
  }
  /* ----------------------------------------------------------- tab: ICD */
  function tIcd(box) {
    const formI = (x) => formModal({ judul: x ? 'Ubah ICD-10' : 'Tambah Kode ICD-10', nilai: x ? { kode: x[0], nama: x[1], nama_id: x[2] } : {}, fields: [{ k: 'kode', label: 'Kode', wajib: true, mono: 1, ph: 'J06.9', ro: !!x }, { k: 'nama', label: 'Nama (Inggris/WHO)', wajib: true }, { k: 'nama_id', label: 'Nama Indonesia', penuh: true }], simpan: (d) => api('icd.simpan', { icd: d }), selesai: async () => { await segarBoot(); muat(); } });
    const t = tabelSederhana(box, { tombol: `<button class="btn primary" data-baru>${ik('add', 's18')} Tambah Kode</button>`, kolom: [{ label: 'Kode', isi: (r) => `<span class="mono b teal">${esc(r[0])}</span>` }, { label: 'Diagnosis', full: 1, isi: (r) => `<span class="nm">${esc(r[1])}</span><div class="sub">${esc(r[2])}</div>` }], ubah: formI });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) formI(null); });
    const muat = () => t.set((App.boot && App.boot.icd) || []);
    muat();
  }
  /* ----------------------------------------------------------- tab: profil klinik */
  function tKlinik(box) {
    const st = App.st();
    const F_ = [['KLINIK_NAMA', 'Nama klinik', 1], ['KLINIK_SUBJUDUL', 'Subjudul'], ['KLINIK_ALAMAT', 'Alamat', 1], ['KLINIK_TELEPON', 'Telepon / WA'], ['KLINIK_AKREDITASI', 'Label akreditasi (layar TV)'], ['LOGO_URL', 'URL logo (https / data:image)'], ['APP_URL', 'Alamat aplikasi (untuk QR tiket & kwitansi)'], ['ESTIMASI_MENIT', 'Menit pelayanan per pasien (estimasi)'], ['LOKET_FARMASI', 'Nama loket farmasi (suara panggilan)'], ['LOKET_KASIR', 'Nama loket kasir (suara panggilan)'], ['TIKET_PESAN', 'Pesan kaki tiket antrean', 1], ['KWITANSI_PESAN', 'Pesan kaki kwitansi', 1]];
    box.innerHTML = `<div class="card stack"><div class="grid g2">${F_.map(([k, l, p]) => `<div class="field" style="${p ? 'grid-column:1/-1' : ''}"><label for="k-${k}">${esc(l)}</label><div class="row"><input class="inp white grow" id="k-${k}" value="${esc(st[k] || '')}">${k === 'APP_URL' ? `<button class="btn secondary" id="isi-url" type="button">Isi dari alamat ini</button>` : ''}</div></div>`).join('')}</div>
      <div class="row end"><button class="btn primary" id="k-simpan" data-sibuk="Menyimpan…">${ik('save', 's18')} Simpan Profil</button></div></div>`;
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'isi-url') $('#k-APP_URL', box).value = location.origin + location.pathname.replace(/[^/]*$/, '');
      if (b.id === 'k-simpan') await UI.sibuk(b, async () => { const nilai = {}; F_.forEach(([k]) => { nilai[k] = $('#k-' + k, box).value.trim(); }); const r = await api('pengaturan.simpan', { nilai }); UI.toast(r.success ? 'Profil klinik tersimpan' : 'Gagal', r.success ? '' : r.message, r.success ? '' : 'err'); if (r.success) await segarBoot(); });
    });
  }
  /* ----------------------------------------------------------- tab: layar panggilan */
  function tLayar(box) {
    const st = App.st(); let media = []; try { media = JSON.parse(st.LAYAR_MEDIA || '[]'); } catch (e) { media = []; }
    box.innerHTML = `<div class="grid g2" style="align-items:start">
      <div class="stack">
        <div class="card stack"><h3 class="sec-title">${ik('key', 'teal')} Kode Layar TV</h3><p class="t-sm muted">Buka <b>display.html</b> di TV ruang tunggu lalu masukkan kode ini sekali. Ganti kode bila TV hilang/berpindah tangan.</p>
          <div class="row wrap"><span class="tag-no" style="font-size:22px;padding:10px 14px;letter-spacing:.12em" id="kode-layar">••••••••</span><button class="btn secondary" id="lihat-kode">${ik('visibility', 's18')} Lihat</button><button class="btn danger" id="kode-baru">${ik('autorenew', 's18')} Buat kode baru</button></div>
          <div class="row wrap"><a class="btn soft" href="display.html" target="_blank" rel="noopener">${ik('open_in_new', 's18')} Buka Layar TV</a><button class="btn secondary" id="salin-url">${ik('link', 's18')} Salin alamat layar</button></div></div>
        <div class="card stack"><h3 class="sec-title">${ik('record_voice_over', 'teal')} Suara Panggilan</h3>
          <div class="grid g2">
            <div class="field"><label>Suara</label><select class="sel white" id="s-gender"><option value="perempuan">Perempuan</option><option value="laki-laki">Laki-laki</option></select></div>
            <div class="field"><label>Kecepatan (${esc(st.SUARA_KECEPATAN)})</label><input type="range" min="0.6" max="1.3" step="0.05" id="s-kec" value="${esc(st.SUARA_KECEPATAN || 0.9)}"></div>
            <div class="field"><label>Diulang</label><select class="sel white" id="s-ulang">${[1, 2, 3].map((n) => `<option ${String(n) === String(st.SUARA_ULANG) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field"><label>Opsi</label><label class="chk"><input type="checkbox" id="s-aktif" ${st.SUARA_AKTIF !== 'TIDAK' ? 'checked' : ''}> Suara aktif</label><label class="chk"><input type="checkbox" id="s-chime" ${st.SUARA_CHIME !== 'TIDAK' ? 'checked' : ''}> Nada ding-dong</label></div></div>
          <div class="note info">${ik('info', 's18')}<span class="t-sm">Suara memakai mesin suara browser di TV (Chrome/Edge). Bila suara laki-laki Bahasa Indonesia tidak tersedia di perangkat, nada suara diturunkan otomatis. Suara terdeteksi di perangkat ini: <b id="s-daftar">-</b></span></div>
          <div class="row"><button class="btn secondary" id="s-tes">${ik('volume_up', 's18')} Tes suara di perangkat ini</button></div></div>
      </div>
      <div class="stack">
        <div class="card stack"><h3 class="sec-title">${ik('tv', 'teal')} Tampilan Layar</h3>
          <div class="grid g2"><div class="field"><label>Nama pasien di layar</label><select class="sel white" id="l-nama"><option value="samaran">Samaran (Siti A. M.)</option><option value="lengkap">Lengkap</option><option value="sembunyi">Sembunyikan</option></select></div>
          <div class="field"><label>Cek panggilan tiap (detik)</label><input class="inp white mono" type="number" min="3" max="15" id="l-poll" value="${esc(st.LAYAR_POLLING_DTK || 4)}"></div></div>
          <div class="field"><label>Teks berjalan</label><textarea class="ta white" id="l-ticker" rows="3">${esc(st.LAYAR_TICKER || '')}</textarea></div></div>
        <div class="card stack"><div class="row between"><h3 class="sec-title">${ik('slideshow', 'teal')} Slide / Video Profil</h3><button class="btn sm secondary" id="m-tambah">${ik('add', 's16')} Tambah</button></div>
          <p class="t-xs muted">Gambar (URL https atau img/… di folder frontend), video MP4 (URL), atau YouTube (link video — diputar tanpa suara). Diputar bergantian tiap 15 detik.</p><div class="stack sm" id="m-list"></div></div>
      </div></div>
      <div class="row end mt-md"><button class="btn primary lg" id="l-simpan" data-sibuk="Menyimpan…">${ik('save', 's18')} Simpan Pengaturan Layar</button></div>`;
    $('#s-gender', box).value = st.SUARA_GENDER === 'laki-laki' ? 'laki-laki' : 'perempuan';
    $('#l-nama', box).value = st.LAYAR_TAMPIL_NAMA || 'samaran';
    const gambarMedia = () => { $('#m-list', box).innerHTML = media.length ? media.map((m, i) => `<div class="panel stack sm"><div class="row"><select class="sel white" style="width:130px" data-mi="${i}" data-mk="jenis">${['gambar', 'video', 'youtube'].map((j) => `<option ${m.jenis === j ? 'selected' : ''}>${j}</option>`).join('')}</select><input class="inp white grow" data-mi="${i}" data-mk="url" value="${esc(m.url)}" placeholder="URL"><button class="btn icon sm ghost" data-up="${i}" aria-label="Naik">${ik('arrow_upward', 's16')}</button><button class="btn icon sm ghost" data-del="${i}" aria-label="Hapus">${ik('delete', 's16')}</button></div><div class="grid g2"><input class="inp white" data-mi="${i}" data-mk="judul" value="${esc(m.judul || '')}" placeholder="Judul"><input class="inp white" data-mi="${i}" data-mk="keterangan" value="${esc(m.keterangan || '')}" placeholder="Keterangan"></div></div>`).join('') : '<p class="t-sm muted">Belum ada slide. Layar akan menampilkan kartu informasi klinik.</p>'; };
    gambarMedia();
    const daftarSuara = () => { if (window.Suara) { const v = Suara.daftarIndonesia(); $('#s-daftar', box).textContent = v.length ? v.map((x) => x.name).join(', ') : 'tidak ada suara Bahasa Indonesia (pakai suara bawaan)'; } };
    daftarSuara(); setTimeout(daftarSuara, 800);
    box.addEventListener('input', (e) => { const t = e.target; if (t.dataset.mi !== undefined) media[+t.dataset.mi][t.dataset.mk] = t.value; });
    box.addEventListener('change', (e) => { const t = e.target; if (t.dataset.mi !== undefined) media[+t.dataset.mi][t.dataset.mk] = t.value; });
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'm-tambah') { media.push({ jenis: 'gambar', url: '', judul: '', keterangan: '' }); gambarMedia(); }
      if (b.dataset.del) { media.splice(+b.dataset.del, 1); gambarMedia(); }
      if (b.dataset.up && +b.dataset.up > 0) { const i = +b.dataset.up; [media[i - 1], media[i]] = [media[i], media[i - 1]]; gambarMedia(); }
      if (b.id === 'lihat-kode' || b.id === 'salin-url') { const r = await api('keamanan.status'); if (r.success) { $('#kode-layar', box).textContent = r.data.kodeLayar; if (b.id === 'salin-url') { const u = location.origin + location.pathname.replace(/[^/]*$/, '') + 'display.html'; navigator.clipboard && navigator.clipboard.writeText(u); UI.toast('Alamat layar disalin', u); } } }
      if (b.id === 'kode-baru' && await UI.konfirmasi('Kode lama langsung tidak berlaku. Semua TV harus memasukkan kode baru. Lanjutkan?', { bahaya: true, ok: 'Buat kode baru' })) { const r = await api('layar.kodeBaru'); if (r.success) { $('#kode-layar', box).textContent = r.data.kodeLayar; UI.toast(r.message); } }
      if (b.id === 's-tes') { if (!window.Suara) return UI.toast('Modul suara tidak tersedia', '', 'err'); Suara.aktifkan(); const p = App.poli()[0] || { nama: 'Poli Umum', ruang: 'Ruang 1', kode_antrean: 'A' }; Suara.umumkan({ no: (p.kode_antrean || 'A') + '-012', nama_tujuan: p.nama, ruang: p.ruang }, { gender: $('#s-gender', box).value, kecepatan: Number($('#s-kec', box).value), ulang: 1, chime: $('#s-chime', box).checked }); }
      if (b.id === 'l-simpan') await UI.sibuk(b, async () => {
        const bersih = media.filter((m) => m.url && m.url.trim());
        const r = await api('pengaturan.simpan', { nilai: { SUARA_GENDER: $('#s-gender', box).value, SUARA_KECEPATAN: $('#s-kec', box).value, SUARA_ULANG: $('#s-ulang', box).value, SUARA_AKTIF: $('#s-aktif', box).checked ? 'YA' : 'TIDAK', SUARA_CHIME: $('#s-chime', box).checked ? 'YA' : 'TIDAK', LAYAR_TAMPIL_NAMA: $('#l-nama', box).value, LAYAR_POLLING_DTK: $('#l-poll', box).value, LAYAR_TICKER: $('#l-ticker', box).value, LAYAR_MEDIA: JSON.stringify(bersih) } });
        UI.toast(r.success ? 'Pengaturan layar tersimpan' : 'Gagal', r.success ? 'TV akan memakai pengaturan baru dalam beberapa detik.' : r.message, r.success ? '' : 'err'); if (r.success) segarBoot();
      });
    });
  }
  /* ----------------------------------------------------------- tab: struk & printer */
  async function tStruk(box) {
    box.innerHTML = `<div class="stack"><div class="card"><h3 class="sec-title mb-md">${ik('tune', 'teal')} Pengaturan Printer Bawaan</h3><div id="st-printer">${UI.skel(3)}</div></div><div class="card"><h3 class="sec-title mb-md">${ik('edit_document', 'teal')} Model Tiket & Kwitansi</h3><div id="st-editor">${UI.skel(5)}</div></div></div>`;
    try { await App.struk(); } catch (e) { box.innerHTML = `<div class="note danger">Modul struk gagal dimuat: ${esc(e.message)}</div>`; return; }
    const aksi = (n, d) => api(n, d || {});
    const segarkan = async () => { const r = await api('struk.list'); if (r.success) { App.boot.struk = r.data; StrukPrinter.pasang({ templates: r.data.templates, server: r.data.printer, appUrl: App.appUrl() }); } S.Store.del('boot'); };
    StrukUI.pengaturan($('#st-printer', box), { aksi, toast: (j, i, t) => UI.toast(j, i, t) });
    StrukUI.editor($('#st-editor', box), { aksi, segarkan, toast: (j, i, t) => UI.toast(j, i, t), konfirmasi: (t) => UI.konfirmasi(t) });
  }
  /* ----------------------------------------------------------- tab: keamanan */
  function tKeamanan(box) {
    box.innerHTML = UI.skel(5);
    api('keamanan.status').then((r) => {
      if (!r.success) { box.innerHTML = `<div class="note danger">${esc(r.message)}</div>`; return; }
      const d = r.data, origin = location.origin;
      box.innerHTML = `<div class="grid g2" style="align-items:start">
        <div class="card stack"><h3 class="sec-title">${ik('login', 'teal')} Login dengan Google</h3>
          ${d.googleClientId ? `<div class="note ok">${ik('check_circle', 's18')}<span>Aktif. Client ID: <span class="mono t-xs">${esc(d.googleClientId)}</span></span></div>` : `<div class="note">${ik('warning', 's18')}<span>Belum aktif — pengguna belum bisa masuk dengan Google.</span></div>`}
          <ol class="t-sm" style="padding-left:1.1rem;margin:0;display:grid;gap:.35rem"><li>Buka <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console → Credentials</a>.</li><li>Create credentials → <b>OAuth client ID</b> → jenis <b>Web application</b>.</li><li>Authorized JavaScript origins: <code class="mono">${esc(origin)}</code></li><li>Salin Client ID (berakhiran <code>.apps.googleusercontent.com</code>) lalu tempel di bawah.</li></ol>
          <div class="field"><label for="cid">Google OAuth Client ID</label><input class="inp white mono" id="cid" placeholder="1234-abcd.apps.googleusercontent.com" value="${esc(d.googleClientId)}" autocomplete="off"></div>
          <div class="row"><button class="btn primary" id="cid-simpan" data-sibuk="Menyimpan…">${ik('save', 's18')} Simpan Client ID</button>${d.googleClientId ? `<button class="btn ghost" id="cid-hapus">Hapus</button>` : ''}</div>
          <p class="t-xs muted">Client ID bukan rahasia, tetapi disimpan di Script Properties (bukan di kode) agar bisa diganti tanpa deploy ulang.</p></div>
        <div class="stack">
          <div class="card stack"><h3 class="sec-title">${ik('emergency_home', 'teal')} Akses Darurat</h3>
            <p class="t-sm muted">Dipakai bila login Google bermasalah. Alamat: <code class="mono">…/index.html#/darurat</code> (tidak ditautkan di mana pun). Nama pengguna: <b class="mono">${esc(d.daruratUser)}</b>. Gagal 5× → terkunci 15 menit${d.daruratTerkunci ? ' <b class="red">(sedang terkunci)</b>' : ''}.</p>
            <div class="field"><label for="dsandi">Kata sandi baru (min. 12 karakter, huruf + angka)</label><input class="inp white" type="password" id="dsandi" autocomplete="new-password"></div>
            <div class="field"><label for="dsandi2">Ulangi kata sandi baru</label><input class="inp white" type="password" id="dsandi2" autocomplete="new-password"></div>
            <div class="row"><button class="btn danger" id="d-rotasi" data-sibuk="Menyimpan…">${ik('password', 's18')} Ganti sandi darurat</button></div>
            ${Sesi.me.darurat ? `<div class="note">${ik('info', 's18')}<span>Anda sedang memakai akses darurat. Setelah Google aktif dan akun Admin terdaftar di tab Pengguna, gunakan login Google.</span></div>` : ''}</div>
          <div class="card stack"><h3 class="sec-title">${ik('devices', 'teal')} Sesi</h3><p class="t-sm muted">Sesi berlaku ${esc(d.sesiJam)} jam. Rahasia sesi, hash sandi, dan kode layar hanya tersimpan di Script Properties Apps Script — tidak pernah dikirim ke browser atau ditulis di spreadsheet.</p><div class="row"><button class="btn secondary" id="s-semua">${ik('logout', 's18')} Keluar dari semua perangkat (akun saya)</button></div></div>
        </div></div>`;
    });
    if (box._ev) return; box._ev = 1;
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'cid-simpan') await UI.sibuk(b, async () => { const r = await api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#cid', box).value.trim() }); UI.toast(r.success ? 'Client ID tersimpan' : 'Gagal', r.success ? 'Login Google siap dipakai.' : r.message, r.success ? '' : 'err'); if (r.success) { S.Store.del('authcfg'); tKeamanan(box); } });
      if (b.id === 'cid-hapus' && await UI.konfirmasi('Hapus Client ID? Login Google akan nonaktif.', { bahaya: true, ok: 'Hapus' })) { const r = await api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: '__HAPUS__' }); UI.toast(r.success ? 'Client ID dihapus' : r.message); tKeamanan(box); }
      if (b.id === 'd-rotasi') {
        const s1 = $('#dsandi', box).value, s2 = $('#dsandi2', box).value;
        if (s1 !== s2) return UI.toast('Kata sandi tidak sama', '', 'err');
        await UI.sibuk(b, async () => { const r = await api('keamanan.rotasiDarurat', { sandiBaru: s1 }); $('#dsandi', box).value = ''; $('#dsandi2', box).value = ''; UI.toast(r.success ? 'Sandi darurat diganti' : 'Gagal', r.message, r.success ? '' : 'err'); if (r.success && r.data.keluar) { Sesi.hapus(); location.reload(); } });
      }
      if (b.id === 's-semua' && await UI.konfirmasi('Akhiri semua sesi akun Anda (termasuk perangkat ini)?', { ok: 'Keluar semua' })) { await api('auth.keluarSemua'); Sesi.hapus(); location.reload(); }
    });
  }
  /* ----------------------------------------------------------- tab: import */
  function tImport(box) {
    const SHEETS = ['Pengguna', 'Poli', 'Tarif', 'Obat', 'ICD10', 'Pasien', 'Kunjungan', 'RME', 'Resep', 'Tagihan'];
    box.innerHTML = `<div class="grid g2" style="align-items:start">
      <div class="card stack"><h3 class="sec-title">${ik('sync_alt', 'teal')} Import dari Spreadsheet App Lama</h3>
        <div class="note info">${ik('info', 's18')}<span class="t-sm">Spreadsheet lama <b>hanya dibaca</b>, tidak diubah. Header dibaca berdasarkan nama kolom (mis. “No RM”, “Nama Pasien”, “NIK”). Aman diulang — data yang sudah ada tidak digandakan. Jalankan <b>Pindai</b> dulu, lalu <b>Import</b>; ulangi Import tepat sebelum pindah (delta sync).</span></div>
        <div class="field"><label for="im-src">URL atau ID spreadsheet lama</label><input class="inp white mono" id="im-src" placeholder="https://docs.google.com/spreadsheets/d/…"><span class="hint">Harus milik / dibagikan ke akun Google pemilik Apps Script ini.</span></div>
        <div class="field"><span class="flabel">Data yang diimpor</span><div class="row wrap">${SHEETS.map((s) => `<label class="chk"><input type="checkbox" value="${s}" checked data-sh> ${s}</label>`).join('')}</div></div>
        <label class="chk"><input type="checkbox" id="im-timpa"> Timpa data master yang sudah ada (alamat, HP, harga, stok…) dengan nilai dari app lama</label>
        <div class="row"><button class="btn secondary" id="im-pindai" data-sibuk="Memindai…">${ik('search', 's18')} Pindai (tanpa menulis)</button><button class="btn primary" id="im-jalan" data-sibuk="Mengimpor…">${ik('download', 's18')} Jalankan Import</button></div>
        <div id="im-hasil"></div></div>
      <div class="card stack"><h3 class="sec-title">${ik('csv', 'teal')} Import dari CSV</h3>
        <p class="t-sm muted">Untuk data dari luar (Excel/aplikasi lain). Simpan sebagai CSV, kolom dikenali otomatis dari nama header.</p>
        <div class="grid g2"><div class="field"><label for="csv-jenis">Jenis data</label><select class="sel white" id="csv-jenis"><option>Pasien</option><option>Obat</option><option>Tarif</option><option>ICD10</option><option>Pengguna</option></select></div><div class="field"><label>Templat</label><button class="btn secondary" id="csv-templat">${ik('download', 's18')} Unduh templat</button></div></div>
        <div class="field"><label for="csv-file">Berkas CSV</label><input class="inp white" type="file" id="csv-file" accept=".csv,text/csv"></div>
        <label class="chk"><input type="checkbox" id="csv-timpa"> Timpa data yang sudah ada</label>
        <div class="row"><button class="btn secondary" id="csv-pindai" data-sibuk="Memindai…">${ik('search', 's18')} Pindai CSV</button><button class="btn primary" id="csv-jalan" data-sibuk="Mengimpor…">${ik('download', 's18')} Import CSV</button></div>
        <div id="csv-hasil"></div></div></div>`;
    const TEMPLAT = { Pasien: ['No RM', 'NIK', 'Nama Pasien', 'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'No HP', 'Penjamin', 'No BPJS', 'Golongan Darah', 'Alergi'], Obat: ['Kode Obat', 'Nama Obat', 'Sediaan', 'Satuan', 'Kategori', 'Harga Jual', 'Stok', 'Stok Minimum', 'Expired'], Tarif: ['Kode', 'Nama Tindakan', 'Kategori', 'Harga'], ICD10: ['Kode', 'Nama', 'Nama Indonesia'], Pengguna: ['Email', 'Nama', 'Peran', 'Poli', 'Status'] };
    const hasilHtml = (d) => `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Data</th><th class="num">Di sumber</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>${Object.keys(d.laporan).map((k) => { const x = d.laporan[k]; return `<tr><td class="sb">${esc(k)}${x.catatan ? `<div class="sub">${esc(x.catatan)}</div>` : ''}</td><td class="num">${esc(x.sumber)}</td><td class="num green b">${esc(x.ditambah)}</td><td class="num">${esc(x.diperbarui)}</td><td class="num muted">${esc(x.dilewati)}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="note ${d.dryRun ? 'info' : 'ok'} mt-sm">${ik(d.dryRun ? 'search' : 'task_alt', 's18')}<span>${d.dryRun ? 'Hasil PINDAI — belum ada data yang ditulis.' : 'Import selesai' + (d.detik !== undefined ? ' dalam ' + d.detik + ' detik' : '') + '. Nomor RM/antrean diselaraskan otomatis.'}${d.kolomDikenali ? '<br>Kolom dikenali: ' + esc(d.kolomDikenali.join(', ')) : ''}</span></div>
      ${d.peringatan && d.peringatan.length ? `<details class="mt-sm"><summary class="lbl amber-t" style="cursor:pointer">${d.peringatan.length} peringatan</summary><ul class="t-xs">${d.peringatan.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></details>` : ''}`;
    const jalan = async (b, dry) => {
      const src = $('#im-src', box).value.trim(); if (!src) return UI.toast('Tempel URL spreadsheet lama', '', 'err');
      if (!dry && !(await UI.konfirmasi('Jalankan import ke database SIMRS Mini sekarang?', { ok: 'Import' }))) return;
      await UI.sibuk(b, async () => { const r = await api('import.jalankan', { sumber: src, sheets: $$('[data-sh]:checked', box).map((x) => x.value), dryRun: dry, timpa: $('#im-timpa', box).checked }, { timeout: 360000 }); $('#im-hasil', box).innerHTML = r.success ? `<div class="t-sm muted mb-sm">Sumber: <b>${esc(r.data.sumber.nama)}</b></div>` + hasilHtml(r.data) : `<div class="note danger">${esc(r.message)}</div>`; if (r.success && !dry) { S.Store.del('obat'); segarBoot(); } });
    };
    let csvRows = null;
    const jalanCsv = async (b, dry) => {
      const f = $('#csv-file', box).files[0]; if (!f) return UI.toast('Pilih berkas CSV', '', 'err');
      csvRows = Berkas.csv(await Berkas.bacaTeks(f));
      if (!csvRows.length) return UI.toast('CSV kosong', '', 'err');
      if (!dry && !(await UI.konfirmasi(`Import ${csvRows.length} baris ${$('#csv-jenis', box).value}?`, { ok: 'Import' }))) return;
      await UI.sibuk(b, async () => { const r = await api('import.csv', { sheet: $('#csv-jenis', box).value, rows: csvRows, dryRun: dry, timpa: $('#csv-timpa', box).checked }, { timeout: 360000 }); $('#csv-hasil', box).innerHTML = r.success ? hasilHtml(r.data) : `<div class="note danger">${esc(r.message)}</div>`; if (r.success && !dry) { S.Store.del('obat'); segarBoot(); } });
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'im-pindai') jalan(b, true); if (b.id === 'im-jalan') jalan(b, false);
      if (b.id === 'csv-pindai') jalanCsv(b, true); if (b.id === 'csv-jalan') jalanCsv(b, false);
      if (b.id === 'csv-templat') { const j = $('#csv-jenis', box).value; Berkas.unduhBlob(new Blob(['﻿' + TEMPLAT[j].join(',') + '\n'], { type: 'text/csv' }), 'templat-' + j.toLowerCase() + '.csv'); }
    });
  }
  /* ----------------------------------------------------------- tab: audit */
  function tAudit(box) {
    const sampai = F.iso(), dari = F.iso(new Date(Date.now() - 7 * 864e5));
    box.innerHTML = `<div class="card pad-0"><div class="row wrap" style="padding:1rem 1.25rem;gap:.75rem;align-items:flex-end"><div class="field"><label>Dari</label><input class="inp white" type="date" id="au-dari" value="${dari}"></div><div class="field"><label>Sampai</label><input class="inp white" type="date" id="au-sampai" value="${sampai}"></div><div class="field"><label>Jenis</label><select class="sel white" id="au-aksi"><option value="">Semua aksi</option><option value="RME">Akses RME</option><option value="LOGIN">Login</option><option value="TAGIHAN">Pembayaran</option><option value="RESEP">Farmasi</option><option value="PENGGUNA">Pengguna</option><option value="IMPORT">Import</option></select></div><div class="field grow"><label>Cari</label><input class="inp white" id="au-q" placeholder="email, no. RM, kunjungan…"></div><button class="btn primary" id="au-cari">${ik('search', 's18')} Tampilkan</button></div>
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data</th><th>Detail</th></tr></thead><tbody id="au-body"></tbody></table></div></div>`;
    const muat = async () => {
      $('#au-body', box).innerHTML = `<tr><td colspan="5">${UI.skel(4)}</td></tr>`;
      const r = await api('audit.list', { dari: $('#au-dari', box).value, sampai: $('#au-sampai', box).value, q: $('#au-q', box).value.trim(), aksi: $('#au-aksi', box).value });
      $('#au-body', box).innerHTML = r.success && r.data.length ? r.data.map((x) => `<tr><td class="mono t-xs nowrap">${esc(x.waktu)}</td><td class="t-sm">${esc(x.email)}<div class="sub">${esc(x.peran)}</div></td><td><span class="badge ${/RME|LAMPIRAN/.test(x.aksi) ? 'teal' : /GAGAL|DITOLAK|BATAL/.test(x.aksi) ? 'danger' : ''}">${esc(x.aksi)}</span></td><td class="mono t-xs">${esc(x.entitas)} ${esc(x.id_data)}</td><td class="t-xs muted" style="max-width:360px;word-break:break-word">${esc(x.detail)}</td></tr>`).join('') : `<tr><td colspan="5">${r.success ? UI.kosong('Tidak ada catatan', 'policy') : `<div class="note danger">${esc(r.message)}</div>`}</td></tr>`;
    };
    $('#au-cari', box).onclick = muat; muat();
  }
  /* ----------------------------------------------------------- tab: sistem */
  function tSistem(box) {
    const muat = async (paksa) => {
      box.innerHTML = UI.skel(5);
      const r = await api('sistem.status', { _fresh: !!paksa });
      if (!r.success) { box.innerHTML = `<div class="note danger">${esc(r.message)}</div>`; return; }
      const d = r.data;
      box.innerHTML = `<div class="grid g2" style="align-items:start">
        <div class="card stack"><h3 class="sec-title">${ik('dns', 'teal')} Status</h3><div class="kv">
          <div><span>Versi backend</span><span class="mono">${esc(d.versi)}</span></div><div><span>Versi frontend</span><span class="mono">${esc(S.CFG.VERSI || '-')}</span></div>
          <div><span>Zona waktu</span><span>${esc(d.zonaWaktu)}</span></div><div><span>Trigger</span><span>${esc(d.trigger.join(', ') || '-')}</span></div>
          <div><span>keepWarm</span><span>${d.keepWarm ? 'aktif (tiap 5 menit)' : 'dimatikan'}</span></div><div><span>Cache terakhir dipanaskan</span><span>${esc(d.warm ? d.warm.at : 'belum')}</span></div>
          <div><span>Antrean email</span><span>${esc(d.antreanEmail)}</span></div><div><span>Script Properties</span><span>${esc(d.props.kunci)} kunci • ${esc(d.props.kb)} KB / 500 KB</span></div></div>
          <div class="row wrap"><a class="btn secondary" href="${esc(d.spreadsheetUrl)}" target="_blank" rel="noopener">${ik('table_view', 's18 teal')} Buka Database</a><a class="btn secondary" href="${esc(d.folderUrl)}" target="_blank" rel="noopener">${ik('folder', 's18 teal')} Folder Drive</a></div></div>
        <div class="card stack"><h3 class="sec-title">${ik('table_rows', 'teal')} Jumlah Baris Data</h3><div class="kv">${Object.keys(d.baris).map((k) => `<div><span>${esc(k)}</span><span class="mono">${esc(F.angka(d.baris[k]))}</span></div>`).join('')}</div>
          <div class="row wrap"><button class="btn primary" id="sy-backup" data-sibuk="Membuat backup…">${ik('backup', 's18')} Backup sekarang</button><button class="btn secondary" id="sy-segar">${ik('refresh', 's18')} Segarkan</button></div>
          <p class="t-xs muted">Backup otomatis dibuat tiap hari pukul 23.00 WIB di folder Backup (14 salinan terakhir disimpan).</p></div></div>`;
    };
    box.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'sy-segar') muat(true); if (b.id === 'sy-backup') await UI.sibuk(b, async () => { const r = await api('sistem.backup'); UI.toast(r.success ? 'Backup dibuat' : 'Gagal', r.message, r.success ? '' : 'err'); }); });
    muat(false);
  }

  App.halaman.kelola = {
    render(el, seg) {
      const tab = seg[0] && TAB.find((t) => t[0] === seg[0]) ? seg[0] : 'pengguna';
      el.innerHTML = `<div class="page-h"><div><h1 class="h-xl">${ik('manage_accounts', 's28 teal')} Kelola Sistem</h1><p>Pengguna &amp; peran, data master, pengaturan klinik, layar panggilan, printer, keamanan, dan migrasi data.</p></div></div>
        <div class="tabs" role="tablist">${TAB.map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${ik(i, 's18')} ${l}</button>`).join('')}</div><div id="kl-isi"></div>`;
      $('.tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) Router.go('/kelola/' + b.dataset.tab); });
      const on = $('.tabs .on', el); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      ({ pengguna: tPengguna, poli: tPoli, obat: tObat, tarif: tTarif, icd: tIcd, klinik: tKlinik, layar: tLayar, struk: tStruk, keamanan: tKeamanan, import: tImport, audit: tAudit, sistem: tSistem })[tab]($('#kl-isi', el));
    }
  };
})();
