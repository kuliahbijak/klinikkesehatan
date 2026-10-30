/* SIMRS Mini — Kasir / Billing (Kasir, Admin) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, swr, UI, Sesi, Berkas } = S;
  const JENIS = { ADMINISTRASI: 'Administrasi', KONSULTASI: 'Konsultasi Dokter', TINDAKAN: 'Tindakan', OBAT: 'Obat & BMHP' };
  const METODE = [['Tunai', 'payments'], ['QRIS', 'qr_code_2'], ['Transfer', 'account_balance'], ['BPJS', 'verified'], ['Asuransi', 'health_and_safety']];

  App.halaman.kasir = {
    render(el, seg, params) {
      const st = { f: 'belum', q: '', data: null, pilih: params && params.id ? params.id : '', detail: null, metode: '', dibayar: 0 };
      el.innerHTML = `<div class="page-h"><div><h1 class="h-xl">${ik('receipt_long', 's28 teal')} Kasir / Billing</h1><p>Tagihan disusun otomatis dari konsultasi, tindakan, dan obat yang diserahkan farmasi.</p></div><button class="btn icon secondary" id="ks-segar" aria-label="Segarkan">${ik('refresh')}</button></div>
        <div class="grid" style="grid-template-columns:minmax(260px,4fr) minmax(0,8fr);align-items:start" id="ks-grid">
          <div class="card stack sm" style="padding:1rem"><div class="pills" id="ks-pills"></div><div class="inp-wrap">${ik('search')}<input class="inp" id="ks-q" placeholder="Nama / No. tagihan / RM…"></div><div class="qlist" id="ks-list">${UI.skel(4)}</div></div>
          <div id="ks-detail">${detailKosong()}</div>
        </div>`;
      if (innerWidth < 900) $('#ks-grid', el).style.gridTemplateColumns = 'minmax(0,1fr)';
      function detailKosong() { return `<div class="card">${UI.kosong('Pilih tagihan di sebelah kiri untuk memproses pembayaran', 'point_of_sale')}</div>`; }
      const renderList = () => {
        const d = st.data || [], n = { belum: d.filter((t) => t.status_bayar === 'Belum Bayar').length, lunas: d.filter((t) => t.status_bayar === 'Lunas').length };
        $('#ks-pills', el).innerHTML = `<button class="pill ${st.f === 'belum' ? 'on' : ''}" data-f="belum">Belum Bayar (${n.belum})</button><button class="pill ${st.f === 'lunas' ? 'on' : ''}" data-f="lunas">Lunas Hari Ini (${n.lunas})</button>`;
        const q = st.q.toLowerCase();
        const rows = d.filter((t) => (st.f === 'belum' ? t.status_bayar === 'Belum Bayar' : t.status_bayar === 'Lunas') && (!q || (t.nama_pasien + ' ' + t.id_tagihan + ' ' + t.id_rm + ' ' + (t.no_antrean || '')).toLowerCase().includes(q)));
        $('#ks-list', el).innerHTML = rows.length ? rows.map((t) => `<button class="qitem ${st.pilih === t.id_tagihan ? 'on' : ''}" data-id="${esc(t.id_tagihan)}"><span class="tag-no">${esc(t.no_antrean || '—')}</span><span class="col grow" style="gap:0;min-width:0"><span class="sb trunc">${esc(t.nama_pasien)}</span><span class="t-xs muted mono trunc">${esc(t.id_tagihan)} • ${esc(t.penjamin)}</span></span><span class="col ta-r" style="gap:2px"><span class="mono sb t-sm">${esc(F.rp(t.status_bayar === 'Lunas' ? t.harus_bayar : t.total))}</span>${t.status_bayar === 'Lunas' ? '<span class="badge ok">Lunas</span>' : t.status_farmasi && !['Diserahkan', 'Tanpa Resep'].includes(t.status_farmasi) ? `<span class="badge warn">${esc(t.status_farmasi)}</span>` : '<span class="badge teal">Siap bayar</span>'}</span></button>`).join('') : UI.kosong(st.f === 'belum' ? 'Tidak ada tagihan menunggu' : 'Belum ada pembayaran hari ini', 'task_alt');
      };
      const muat = (paksa) => swr('kasir', 'kasir.antrean', {}, (d, c, err) => { if (err) { $('#ks-list', el).innerHTML = `<div class="note danger">${esc(err.message)}</div>`; return; } st.data = d; renderList(); }, { maxAge: 8000, phi: true, paksa });
      muat(); App.setPoll(() => muat(false), 15000, 60000);

      async function buka(id) {
        st.pilih = id; renderList();
        $('#ks-detail', el).innerHTML = `<div class="card">${UI.skel(6)}</div>`;
        if (innerWidth < 900) $('#ks-detail', el).scrollIntoView({ behavior: 'smooth' });
        const r = await api('kasir.detail', { id_tagihan: id });
        if (!r.success) { $('#ks-detail', el).innerHTML = `<div class="note danger">${esc(r.message)}</div>`; return; }
        st.detail = r.data; st.metode = r.data.metode || (r.data.penjamin === 'BPJS' ? 'BPJS' : r.data.penjamin === 'Asuransi' ? 'Asuransi' : 'Tunai'); st.dibayar = 0;
        gambarDetail();
      }
      function hitung() {
        const t = st.detail, diskon = Math.max(0, Math.min(t.total, Number(($('#ks-diskon', el) || {}).value) || 0)), dijamin = ['BPJS', 'Asuransi'].includes(st.metode);
        const harus = dijamin ? 0 : t.total - diskon, diterima = st.metode === 'Tunai' ? Number(($('#ks-terima', el) || {}).value) || 0 : harus;
        return { diskon, ditanggung: dijamin ? t.total - diskon : 0, harus, diterima, kembali: st.metode === 'Tunai' ? diterima - harus : 0 };
      }
      function gambarHitung() {
        const h = hitung();
        $('#ks-tanggung', el).hidden = !h.ditanggung; $('#ks-tanggung-v', el).textContent = '- ' + F.rp(h.ditanggung);
        $('#ks-harus', el).textContent = F.rp(h.harus);
        const box = $('#ks-kembali', el); if (box) { box.textContent = h.diterima ? F.rp(Math.max(0, h.kembali)) : '-'; box.className = 'h-md mono ' + (h.diterima && h.kembali < 0 ? 'red' : 'green'); $('#ks-kurang', el).hidden = !(h.diterima && h.kembali < 0); }
      }
      function gambarDetail() {
        const t = st.detail, lunas = t.status_bayar === 'Lunas', grup = {};
        t.rincian.forEach((x) => { (grup[x.jenis] = grup[x.jenis] || []).push(x); });
        const belumFarmasi = !lunas && t.status_farmasi && !['Diserahkan', 'Tanpa Resep'].includes(t.status_farmasi);
        $('#ks-detail', el).innerHTML = `<div class="card stack">
          <div class="row between wrap"><div class="row gap-md"><span class="avatar lg">${esc(F.inisial(t.nama_pasien))}</span><div class="col"><span class="h-md">${esc(t.nama_pasien)}</span><span class="t-sm muted mono">${esc(t.id_rm)} • ${esc(t.poli)} • Antrean ${esc(t.no_antrean || '-')}</span></div></div>
            <div class="row wrap"><span class="badge ${t.penjamin === 'BPJS' ? 'teal' : ''} lg">${ik('verified', 's16')} ${esc(t.penjamin)}${t.pasien && t.pasien.no_penjamin ? ' ' + esc(t.pasien.no_penjamin) : ''}</span>${lunas ? '' : `<button class="btn sm soft" id="ks-panggil">${ik('campaign', 's16')} Panggil ke Kasir</button>`}</div></div>
          ${belumFarmasi ? `<div class="note">${ik('pending_actions', 's18')}<span>Resep masih <b>${esc(t.status_farmasi)}</b> di farmasi. Tagihan obat memakai jumlah resep; bila farmasi menyerahkan lebih sedikit, total menyesuaikan saat dibuka ulang.</span></div>` : ''}
          <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Uraian</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Subtotal</th></tr></thead><tbody>
            ${Object.keys(JENIS).filter((j) => grup[j]).map((j) => `<tr><td colspan="4" class="lbl-sm up muted" style="background:var(--bg)">${esc(JENIS[j])}</td></tr>` + grup[j].map((x) => `<tr><td>${esc(x.nama)}</td><td class="num">${esc(x.qty)}${x.satuan ? ' ' + esc(x.satuan) : ''}</td><td class="num">${esc(F.rp(x.harga))}</td><td class="num">${esc(F.rp(x.sub))}</td></tr>`).join('')).join('')}
          </tbody></table></div>
          <div class="grid g2" style="align-items:start">
            <div class="stack sm">${lunas ? `<div class="note ok">${ik('task_alt', 's18')}<span><b>LUNAS</b> — ${esc(t.metode)} • ${esc(t.waktu_bayar)} • Kasir ${esc(t.kasir)}${t.catatan ? '<br>' + esc(t.catatan) : ''}</span></div>` : `
              <span class="flabel lbl">Metode pembayaran</span><div class="opt-grid g3">${METODE.map(([m, i]) => `<button type="button" class="opt ${st.metode === m ? 'on' : ''}" data-m="${m}" style="justify-content:center">${ik(i, 's18')} ${m}</button>`).join('')}</div>
              <div class="grid g2"><div class="field"><label for="ks-diskon">Diskon (Rp)</label><input class="inp white mono" type="number" min="0" id="ks-diskon" value="0"></div>
              ${st.metode === 'Tunai' ? `<div class="field"><label for="ks-terima">Uang diterima</label><input class="inp white mono" type="number" min="0" id="ks-terima" placeholder="0"></div>` : '<div></div>'}</div>
              ${st.metode === 'Tunai' ? `<div class="row wrap gap-xs" id="ks-cepat">${[0, 20000, 50000, 100000, 200000].map((v) => `<button type="button" class="btn sm secondary" data-uang="${v}">${v ? F.ringkas(v) : 'Uang pas'}</button>`).join('')}</div>` : ''}
              <div class="field"><label for="ks-cat">Catatan</label><input class="inp white" id="ks-cat" placeholder="${st.metode === 'QRIS' || st.metode === 'Transfer' ? 'No. referensi transaksi' : 'Opsional'}"></div>`}
            </div>
            <div class="panel stack sm" style="padding:1rem">
              <div class="row between"><span class="muted">Total biaya</span><span class="mono sb">${esc(F.rp(t.total))}</span></div>
              ${lunas && t.diskon ? `<div class="row between"><span class="muted">Diskon</span><span class="mono">- ${esc(F.rp(t.diskon))}</span></div>` : ''}
              <div class="row between" id="ks-tanggung" ${lunas ? (t.ditanggung ? '' : 'hidden') : 'hidden'}><span class="muted">Ditanggung penjamin</span><span class="mono" id="ks-tanggung-v">- ${esc(F.rp(t.ditanggung))}</span></div>
              <div class="hr"></div>
              <div class="row between"><span class="b">${lunas ? 'Dibayar pasien' : 'Harus dibayar'}</span><span class="h-lg mono teal" id="ks-harus">${esc(F.rp(lunas ? t.harus_bayar : t.total))}</span></div>
              ${lunas ? (t.kembalian ? `<div class="row between"><span class="muted">Kembalian</span><span class="mono">${esc(F.rp(t.kembalian))}</span></div>` : '') : (st.metode === 'Tunai' ? `<div class="row between"><span class="muted">Kembalian</span><span id="ks-kembali" class="h-md mono">-</span></div><span class="err-text" id="ks-kurang" hidden>Uang diterima kurang.</span>` : '')}
              ${lunas ? `<div class="grid g2 keep" style="gap:.5rem"><button class="btn primary" id="ks-struk">${ik('print', 's18')} Cetak Struk</button><button class="btn secondary" id="ks-pdf" data-sibuk="Membuat…">${ik('picture_as_pdf', 's18')} Kwitansi PDF</button><button class="btn secondary" id="ks-email">${ik('mail', 's18')} Kirim Email</button>${App.peran() === 'ADMIN' ? `<button class="btn danger" id="ks-batal">${ik('undo', 's18')} Batalkan</button>` : ''}</div>` : `<button class="btn primary lg w100" id="ks-bayar" data-sibuk="Memproses…">${ik('point_of_sale', 's18')} Proses Pembayaran</button>`}
            </div>
          </div></div>`;
        $('#ks-detail', el).oninput = lunas ? null : gambarHitung;
        if (!lunas) gambarHitung();
      }
      $('#ks-q', el).addEventListener('input', S.debounce((e) => { st.q = e.target.value.trim(); renderList(); }, 150));
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.f) { st.f = b.dataset.f; renderList(); }
        if (b.dataset.id) buka(b.dataset.id);
        if (b.id === 'ks-segar') UI.sibuk(b, () => muat(true));
        if (b.dataset.m) { st.metode = b.dataset.m; gambarDetail(); }
        if (b.dataset.uang !== undefined) { const h = hitung(), v = Number(b.dataset.uang); $('#ks-terima', el).value = v ? Math.max(v, Math.ceil(h.harus / v) * v) : h.harus; gambarHitung(); }
        const t = st.detail;
        if (b.id === 'ks-panggil') App.panggil(t.id_kunjungan, 'KASIR', b);
        if (b.id === 'ks-bayar') {
          const h = hitung();
          if (st.metode === 'Tunai' && h.diterima < h.harus) { $('#ks-terima', el).classList.add('salah'); $('#ks-terima', el).focus(); return UI.toast('Uang diterima kurang', 'Harus dibayar ' + F.rp(h.harus), 'err'); }
          if (!(await UI.konfirmasi(`Proses pembayaran ${t.id_tagihan} — ${st.metode}, ${h.ditanggung ? 'ditanggung ' + F.rp(h.ditanggung) : 'dibayar ' + F.rp(h.harus)}?`, { ok: 'Proses' }))) return;
          await UI.sibuk(b, async () => {
            const r = await api('kasir.bayar', { id_tagihan: t.id_tagihan, metode: st.metode, dibayar: h.diterima, diskon: h.diskon, catatan: ($('#ks-cat', el) || {}).value || '' });
            if (!r.success) return UI.toast('Pembayaran gagal', r.message, 'err');
            UI.toast(r.message, h.kembali > 0 ? 'Kembalian ' + F.rp(h.kembali) : '');
            st.detail = Object.assign({}, t, r.data, { status_farmasi: t.status_farmasi }); gambarDetail(); muat(true); S.Store.del('dash');
            App.cetakKwitansi(st.detail, { setelahSimpan: true });
          });
        }
        if (b.id === 'ks-struk') App.cetakKwitansi(t);
        if (b.id === 'ks-pdf') UI.sibuk(b, async () => { const r = await api('kasir.kwitansi', { id_tagihan: t.id_tagihan }); if (r.success) Berkas.unduhBase64(r.data.base64, r.data.nama, r.data.mime); else UI.toast('Gagal', r.message, 'err'); });
        if (b.id === 'ks-email') { const em = await UI.tanya('Kirim Kwitansi ke Email', 'Alamat email pasien / wali', { tipe: 'email', wajib: true, ok: 'Kirim' }); if (em) { const r = await api('kasir.kwitansi', { id_tagihan: t.id_tagihan, email: em }); UI.toast(r.success ? 'Kwitansi diproses' : 'Gagal', r.message, r.success ? '' : 'err'); } }
        if (b.id === 'ks-batal') { const al = await UI.tanya('Batalkan Pembayaran ' + t.id_tagihan, 'Alasan pembatalan', { wajib: true, bahaya: true, ok: 'Batalkan pembayaran' }); if (al) { const r = await api('kasir.batal', { id_tagihan: t.id_tagihan, alasan: al }); UI.toast(r.success ? r.message : 'Gagal', r.success ? '' : r.message, r.success ? '' : 'err'); if (r.success) { muat(true); buka(t.id_tagihan); } } }
      });
      if (st.pilih) buka(st.pilih);
    }
  };
})();
