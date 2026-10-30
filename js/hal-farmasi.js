/* SIMRS Mini — Resep & Farmasi, Stok Obat (Farmasi, Admin) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, swr, UI, Router, Sesi, Berkas } = S;

  /* ---------------------------------------------------- antrean resep */
  function tabResep(box) {
    const st = { filter: 'aktif', data: null };
    box.innerHTML = `<div class="row between wrap mb-md"><div class="pills" id="fr-pills"></div><button class="btn icon secondary" id="fr-segar" aria-label="Segarkan">${ik('refresh')}</button></div><div class="grid g2" id="fr-list">${UI.skel(4)}</div>`;
    const render = () => {
      const d = st.data || [], c = (s) => d.filter((r) => r.status === s).length;
      $('#fr-pills', box).innerHTML = [['aktif', 'Perlu Diproses', c('Menunggu') + c('Disiapkan')], ['siap', 'Siap Diambil', c('Siap Diambil')], ['selesai', 'Diserahkan Hari Ini', c('Diserahkan')], ['batal', 'Batal', c('Batal')]].map(([k, l, n]) => `<button class="pill ${st.filter === k ? 'on' : ''}" data-f="${k}">${l} (${n})</button>`).join('');
      const f = { aktif: (r) => ['Menunggu', 'Disiapkan'].includes(r.status), siap: (r) => r.status === 'Siap Diambil', selesai: (r) => r.status === 'Diserahkan', batal: (r) => r.status === 'Batal' }[st.filter];
      const rows = d.filter(f), pm = App.poliMap();
      $('#fr-list', box).innerHTML = rows.length ? rows.map((r) => {
        const kurang = r.items.some((i) => i.stok < i.jumlah);
        return `<div class="qcard" data-id="${esc(r.id_resep)}">
          <div class="row between top"><div class="row gap-md"><span class="tag-no aktif" style="font-size:16px;padding:6px 10px">${esc(r.no_antrean || '—')}</span><div class="col" style="gap:0"><b>${esc(r.nama_pasien)}</b><span class="t-xs muted mono">${esc(r.id_resep)} • ${esc(r.id_rm)} • ${esc((pm[r.poli] || {}).nama || r.poli)}${r.tanggal !== F.iso() ? ' • ' + esc(F.tgl(r.tanggal)) : ''}</span></div></div>${UI.badgeStatus(r.status)}</div>
          ${r.alergi ? `<div class="note danger" style="padding:.5rem .75rem">${ik('warning', 's16')}<span class="t-xs"><b>Alergi:</b> ${esc(r.alergi)}</span></div>` : ''}
          <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Obat</th><th>Aturan pakai</th><th class="num">Resep</th><th class="num">Stok</th>${r.status === 'Siap Diambil' || r.status === 'Disiapkan' ? '<th class="num">Diserahkan</th>' : r.status === 'Diserahkan' ? '<th class="num">Diserahkan</th>' : ''}</tr></thead><tbody>
            ${r.items.map((i) => `<tr><td><span class="sb">${esc(i.nama_obat)}</span>${i.keterangan ? `<div class="sub">${esc(i.keterangan)}</div>` : ''}</td><td class="t-sm">${esc(i.aturan || '-')}</td><td class="num">${esc(i.jumlah)} ${esc(i.satuan)}</td><td class="num ${i.stok < i.jumlah ? 'red b' : 'muted'}">${esc(i.stok)}</td>
              ${r.status === 'Siap Diambil' || r.status === 'Disiapkan' ? `<td class="num"><input class="inp white mono ta-c" style="height:32px;width:64px;padding:0 4px" type="number" min="0" max="${esc(i.jumlah)}" data-kode="${esc(i.kode_obat)}" value="${esc(Math.min(i.jumlah, i.stok) || 0)}"></td>` : r.status === 'Diserahkan' ? `<td class="num">${esc(i.jumlah_diserahkan)}</td>` : ''}</tr>`).join('')}
          </tbody></table></div>
          ${r.catatan ? `<div class="note info" style="padding:.5rem .75rem">${ik('comment', 's16')}<span class="t-xs"><b>Catatan dokter:</b> ${esc(r.catatan)}</span></div>` : ''}
          ${kurang && ['Menunggu', 'Disiapkan', 'Siap Diambil'].includes(r.status) ? `<div class="note" style="padding:.5rem .75rem">${ik('inventory_2', 's16')}<span class="t-xs">Sebagian stok kurang — jumlah diserahkan otomatis disesuaikan stok. Tagihan mengikuti jumlah yang diserahkan.</span></div>` : ''}
          <div class="row between wrap"><span class="t-xs muted">${esc(r.dokter || '')}${r.petugas ? ' • diproses ' + esc(r.petugas) : ''}</span><div class="row wrap">
            ${r.status === 'Menunggu' ? `<button class="btn sm ghost" data-a="batal">Batalkan</button><button class="btn sm primary" data-a="siapkan">${ik('science', 's16')} Mulai Siapkan</button>` : ''}
            ${r.status === 'Disiapkan' ? `<button class="btn sm ghost" data-a="batal">Batalkan</button><button class="btn sm primary" data-a="siap">${ik('inventory', 's16')} Tandai Siap Diambil</button>` : ''}
            ${r.status === 'Siap Diambil' ? `<button class="btn sm soft" data-a="panggil">${ik('campaign', 's16')} Panggil Pasien</button><button class="btn sm primary" data-a="serahkan">${ik('task_alt', 's16')} Serahkan Obat</button>` : ''}
          </div></div></div>`;
      }).join('') : `<div class="card" style="grid-column:1/-1">${UI.kosong(st.filter === 'aktif' ? 'Tidak ada resep yang perlu diproses' : 'Tidak ada data', 'medication')}</div>`;
    };
    const muat = (paksa) => swr('farmasi', 'farmasi.antrean', {}, (d, c, err) => { if (err) { $('#fr-list', box).innerHTML = `<div class="note danger">${esc(err.message)}</div>`; return; } st.data = d; render(); }, { maxAge: 8000, phi: true, paksa });
    muat(); App.setPoll(() => muat(false), 15000, 60000);
    box.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.f) { st.filter = t.dataset.f; render(); return; }
      if (t.id === 'fr-segar') return UI.sibuk(t, () => muat(true));
      const card = t.closest('[data-id]'); if (!card || !t.dataset.a) return;
      const r = st.data.find((x) => x.id_resep === card.dataset.id), a = t.dataset.a;
      if (a === 'panggil') return App.panggil(r.id_kunjungan, 'FARMASI', t);
      const data = { id_resep: r.id_resep, aksi: a };
      if (a === 'batal') { const alasan = await UI.tanya('Batalkan Resep ' + r.id_resep, 'Alasan pembatalan', { wajib: true, bahaya: true, ok: 'Batalkan resep' }); if (!alasan) return; data.alasan = alasan; }
      if (a === 'serahkan' || a === 'siap') data.items = $$('input[data-kode]', card).map((i) => ({ kode_obat: i.dataset.kode, jumlah_diserahkan: Number(i.value) || 0 }));
      if (a === 'serahkan' && !(await UI.konfirmasi(`Serahkan obat untuk ${r.nama_pasien} (${r.no_antrean})? Stok akan dikurangi otomatis.`, { ok: 'Serahkan' }))) return;
      await UI.sibuk(t, async () => {
        const res = await api('farmasi.proses', data);
        if (!res.success) return UI.toast('Gagal', res.message, 'err');
        UI.toast(res.message, a === 'siap' ? 'Klik Panggil Pasien untuk memanggil ke loket farmasi.' : '');
        S.Store.del('obat'); await muat(true);
      });
    });
  }

  /* ---------------------------------------------------- stok obat */
  function tabStok(box) {
    const st = { q: '', f: 'semua', data: [] }, admin = App.peran() === 'ADMIN';
    box.innerHTML = `<div class="card pad-0"><div class="row between wrap" style="padding:1rem 1.25rem;gap:.75rem"><div class="pills" id="so-pills"></div><div class="row wrap"><div class="inp-wrap" style="width:240px">${ik('search')}<input class="inp" id="so-q" placeholder="Cari obat…"></div>${admin ? `<button class="btn primary" id="so-baru">${ik('add', 's18')} Obat Baru</button>` : ''}<button class="btn icon secondary" id="so-unduh" title="Unduh CSV" aria-label="Unduh CSV">${ik('download')}</button></div></div>
      <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Kode</th><th>Nama Obat</th><th class="hide-m">Kategori</th><th class="num">Harga</th><th class="num">Stok</th><th>Kedaluwarsa</th><th class="ta-r">Mutasi</th></tr></thead><tbody id="so-body"><tr><td colspan="7">${UI.skel(5)}</td></tr></tbody></table></div></div>`;
    const batasEd = (() => { const d = new Date(); d.setDate(d.getDate() + 60); return F.iso(d); })();
    const render = () => {
      const d = st.data, n = { semua: d.length, menipis: d.filter((o) => o.stok <= o.stok_min).length, ed: d.filter((o) => o.tgl_kedaluwarsa && o.tgl_kedaluwarsa <= batasEd).length, nonaktif: d.filter((o) => !o.aktif).length };
      $('#so-pills', box).innerHTML = [['semua', 'Semua'], ['menipis', 'Stok Menipis'], ['ed', 'Hampir Kedaluwarsa'], ['nonaktif', 'Nonaktif']].map(([k, l]) => `<button class="pill ${st.f === k ? 'on' : ''}" data-f="${k}">${l} (${n[k]})</button>`).join('');
      const q = st.q.toLowerCase(), f = { semua: (o) => o.aktif, menipis: (o) => o.stok <= o.stok_min, ed: (o) => o.tgl_kedaluwarsa && o.tgl_kedaluwarsa <= batasEd, nonaktif: (o) => !o.aktif }[st.f];
      const rows = d.filter((o) => f(o) && (!q || (o.kode + ' ' + o.nama + ' ' + o.kategori).toLowerCase().includes(q)));
      $('#so-body', box).innerHTML = rows.length ? rows.map((o) => `<tr><td class="mono t-sm">${esc(o.kode)}</td><td data-c="full"><div class="col" style="gap:0"><span class="nm">${esc(o.nama)}</span><span class="sub">${esc(o.sediaan)} • per ${esc(o.satuan)}</span></div></td><td class="t-sm hide-m">${esc(o.kategori)}</td><td class="num">${esc(F.rp(o.harga))}</td>
        <td class="num"><span class="badge ${o.stok <= 0 ? 'danger' : o.stok <= o.stok_min ? 'warn' : 'ok'}">${esc(F.angka(o.stok))} ${esc(o.satuan)}</span><div class="sub">min ${esc(o.stok_min)}</div></td>
        <td class="mono t-sm ${o.tgl_kedaluwarsa && o.tgl_kedaluwarsa <= batasEd ? 'red b' : ''}">${esc(o.tgl_kedaluwarsa ? F.tgl(o.tgl_kedaluwarsa) : '-')}</td>
        <td class="aksi-c"><div class="aksi"><button class="btn sm soft" data-mut="MASUK" data-kode="${esc(o.kode)}">${ik('add', 's16')} Masuk</button><button class="btn sm ghost" data-mut="KELUAR" data-kode="${esc(o.kode)}" title="Keluar (rusak/kedaluwarsa)">${ik('remove', 's16')}</button><button class="btn sm ghost" data-mut="KOREKSI" data-kode="${esc(o.kode)}" title="Koreksi stok opname">${ik('fact_check', 's16')}</button>${admin ? `<button class="btn sm ghost" data-edit="${esc(o.kode)}" title="Ubah data obat">${ik('edit', 's16')}</button>` : ''}</div></td></tr>`).join('') : `<tr><td colspan="7">${UI.kosong('Tidak ada obat', 'medication')}</td></tr>`;
    };
    const muat = (paksa) => swr('obat', 'obat.list', {}, (d) => { if (d) { st.data = d; render(); } }, { maxAge: 20000, paksa });
    muat(false);
    $('#so-q', box).addEventListener('input', S.debounce((e) => { st.q = e.target.value.trim(); render(); }, 150));
    box.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.f) { st.f = t.dataset.f; render(); }
      if (t.id === 'so-unduh') Berkas.unduhBlob(new Blob([Berkas.keCsv(st.data, ['kode', 'nama', 'sediaan', 'satuan', 'kategori', 'harga', 'stok', 'stok_min', 'tgl_kedaluwarsa'])], { type: 'text/csv' }), 'stok-obat-' + F.iso() + '.csv');
      if (t.id === 'so-baru' || t.dataset.edit) App.formObat(st.data.find((o) => o.kode === t.dataset.edit), () => muat(true));
      if (t.dataset.mut) {
        const o = st.data.find((x) => x.kode === t.dataset.kode), j = t.dataset.mut;
        const m = UI.modal({ judul: { MASUK: 'Stok Masuk', KELUAR: 'Stok Keluar (rusak / kedaluwarsa)', KOREKSI: 'Koreksi Stok (stok opname)' }[j] + ' — ' + o.nama, lebar: 'sm',
          isi: `<div class="stack"><div class="kv"><div><span>Stok saat ini</span><span class="mono">${esc(o.stok)} ${esc(o.satuan)}</span></div></div>
            <div class="field"><label>${j === 'KOREKSI' ? 'Jumlah fisik hasil hitung' : 'Jumlah'} (${esc(o.satuan)})</label><input class="inp white mono" type="number" min="0" id="mj"></div>
            ${j === 'MASUK' ? `<div class="grid g2"><div class="field"><label>Tgl kedaluwarsa batch</label><input class="inp white" type="date" id="med" value="${esc(o.tgl_kedaluwarsa || '')}"></div><div class="field"><label>No. faktur / sumber</label><input class="inp white" id="mref" placeholder="PBF / No. faktur"></div></div>` : ''}
            <div class="field"><label>Catatan</label><input class="inp white" id="mcat" placeholder="${j === 'KELUAR' ? 'Rusak / kedaluwarsa / retur' : 'Opsional'}"></div></div>`,
          aksi: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'primary', onClick: async (tutup, b) => {
            const jumlah = Number($('#mj', m.el).value); if (!(jumlah >= 0) || $('#mj', m.el).value === '') { $('#mj', m.el).classList.add('salah'); return false; }
            const r = await UI.sibuk(b, () => api('obat.stok', { kode: o.kode, jenis: j, jumlah, tgl_kedaluwarsa: $('#med', m.el) ? $('#med', m.el).value : '', ref: $('#mref', m.el) ? $('#mref', m.el).value : '', catatan: $('#mcat', m.el).value }));
            if (!r.success) { UI.toast('Gagal', r.message, 'err'); return false; }
            UI.toast('Stok diperbarui', r.message); muat(true);
          } }] });
      }
    });
  }
  /** Form obat master (dipakai juga di Kelola). */
  App.formObat = (o, selesai) => {
    o = o || {};
    const m = UI.modal({ judul: o.kode ? 'Ubah Obat ' + o.kode : 'Tambah Obat Baru', isi: `<form class="stack" id="fo">
      <div class="grid g2"><div class="field"><label>Kode</label><input class="inp white mono" id="ok" value="${esc(o.kode || '')}" ${o.kode ? 'readonly' : ''} placeholder="Otomatis bila kosong"></div><div class="field"><label>Nama obat <span class="req">*</span></label><input class="inp white" id="on" value="${esc(o.nama || '')}" required></div></div>
      <div class="grid g3"><div class="field"><label>Sediaan</label><input class="inp white" id="os" value="${esc(o.sediaan || '')}" placeholder="Tablet / Sirup 60 ml"></div><div class="field"><label>Satuan</label><input class="inp white" id="osat" value="${esc(o.satuan || '')}" placeholder="Tablet / Botol"></div><div class="field"><label>Kategori</label><input class="inp white" id="okat" value="${esc(o.kategori || '')}" placeholder="Analgesik, Antibiotik (Penisilin)…"></div></div>
      <div class="grid g3"><div class="field"><label>Harga jual / satuan</label><input class="inp white mono" type="number" min="0" id="oh" value="${esc(o.harga || 0)}"></div><div class="field"><label>Stok minimum</label><input class="inp white mono" type="number" min="0" id="omin" value="${esc(o.stok_min || 0)}"></div><div class="field"><label>Kedaluwarsa</label><input class="inp white" type="date" id="oed" value="${esc(o.tgl_kedaluwarsa || '')}"></div></div>
      ${o.kode ? `<label class="chk"><input type="checkbox" id="oak" ${o.aktif !== false ? 'checked' : ''}> Aktif (tampil di formularium dokter)</label>` : `<div class="field"><label>Stok awal</label><input class="inp white mono" type="number" min="0" id="ost" value="0"></div>`}
      <p class="t-xs muted">Tulis golongan alergi di kategori (mis. “Penisilin, Beta-laktam”) agar peringatan alergi bekerja.</p></form>`,
      aksi: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'primary', onClick: async (t, b) => {
        const g = (id) => $('#' + id, m.el);
        if (!g('on').value.trim()) { g('on').classList.add('salah'); return false; }
        const r = await UI.sibuk(b, () => api('obat.simpan', { obat: { kode: g('ok').value.trim(), nama: g('on').value.trim(), sediaan: g('os').value.trim(), satuan: g('osat').value.trim(), kategori: g('okat').value.trim(), harga: Number(g('oh').value) || 0, stok_min: Number(g('omin').value) || 0, tgl_kedaluwarsa: g('oed').value, stok: g('ost') ? Number(g('ost').value) || 0 : undefined, aktif: g('oak') ? g('oak').checked : true } }));
        if (!r.success) { UI.toast('Gagal', r.message, 'err'); return false; }
        UI.toast(r.message); S.Store.del('obat'); if (selesai) selesai();
      } }] });
  };

  /* ---------------------------------------------------- mutasi stok */
  function tabMutasi(box) {
    const akhir = F.iso(), awal = F.iso(new Date(Date.now() - 30 * 864e5));
    box.innerHTML = `<div class="card pad-0"><div class="row wrap" style="padding:1rem 1.25rem;gap:.75rem"><div class="field"><label>Dari</label><input class="inp white" type="date" id="mu-dari" value="${awal}"></div><div class="field"><label>Sampai</label><input class="inp white" type="date" id="mu-sampai" value="${akhir}"></div><button class="btn primary" id="mu-cari" style="align-self:flex-end">${ik('search', 's18')} Tampilkan</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Obat</th><th>Jenis</th><th class="num">Jumlah</th><th class="num">Stok akhir</th><th>Ref</th><th>Petugas</th></tr></thead><tbody id="mu-body"></tbody></table></div></div>`;
    const muat = async () => {
      $('#mu-body', box).innerHTML = `<tr><td colspan="7">${UI.skel(3)}</td></tr>`;
      const r = await api('obat.log', { dari: $('#mu-dari', box).value, sampai: $('#mu-sampai', box).value });
      $('#mu-body', box).innerHTML = r.success && r.data.length ? r.data.map((x) => `<tr><td class="mono t-sm">${esc(x.waktu)}</td><td><span class="sb">${esc(x.nama_obat)}</span><div class="sub mono">${esc(x.kode_obat)}</div></td><td><span class="badge ${x.jenis === 'MASUK' ? 'ok' : x.jenis === 'KELUAR' ? 'warn' : 'info'}">${esc(x.jenis)}</span></td><td class="num">${esc(x.jumlah)}</td><td class="num">${esc(x.stok_akhir)}</td><td class="t-sm">${esc(x.ref || '')}${x.catatan ? `<div class="sub">${esc(x.catatan)}</div>` : ''}</td><td class="t-sm">${esc(x.email)}</td></tr>`).join('') : `<tr><td colspan="7">${r.success ? UI.kosong('Tidak ada mutasi pada rentang ini', 'swap_vert') : `<div class="note danger">${esc(r.message)}</div>`}</td></tr>`;
    };
    $('#mu-cari', box).onclick = muat; muat();
  }

  App.halaman.farmasi = {
    render(el, seg, params) {
      const tab = (params && params.tab) || 'resep';
      el.innerHTML = `<div class="page-h"><div><h1 class="h-xl">${ik('prescriptions', 's28 teal')} Resep &amp; Farmasi</h1><p>Proses e-resep dari dokter, panggil pasien ke loket farmasi, dan kelola stok obat.</p></div></div>
        <div class="tabs" role="tablist">${[['resep', 'Antrean Resep', 'receipt_long'], ['stok', 'Stok Obat', 'inventory_2'], ['mutasi', 'Mutasi Stok', 'swap_vert']].map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${ik(i, 's18')} ${l}</button>`).join('')}</div><div id="fr-isi"></div>`;
      const box = $('#fr-isi', el);
      ({ resep: tabResep, stok: tabStok, mutasi: tabMutasi })[tab](box);
      $('.tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) Router.go('/farmasi?tab=' + b.dataset.tab); });
    }
  };
})();
