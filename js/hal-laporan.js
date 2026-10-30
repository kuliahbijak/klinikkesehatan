/* SIMRS Mini — Laporan & Manajemen (Admin, Manajemen: lihat saja) */
(function () {
  'use strict';
  const { $, $$, esc, ik, F, api, UI, Grafik, Berkas, muatSkrip } = S;
  const KOLOM = {
    kunjungan: [['tanggal', 'Tanggal'], ['jam', 'Jam'], ['no_antrean', 'No.'], ['nama_pasien', 'Pasien'], ['id_rm', 'No. RM'], ['poli', 'Poli'], ['penjamin', 'Penjamin'], ['prioritas', 'Prioritas'], ['status', 'Status'], ['dokter', 'Dokter']],
    tagihan: [['tanggal', 'Tanggal'], ['id_tagihan', 'No. Tagihan'], ['nama_pasien', 'Pasien'], ['poli', 'Poli'], ['penjamin', 'Penjamin'], ['metode', 'Metode'], ['total', 'Total', 1], ['diskon', 'Diskon', 1], ['ditanggung', 'Ditanggung', 1], ['dibayar_pasien', 'Dibayar Pasien', 1], ['status', 'Status'], ['kasir', 'Kasir']],
    diagnosis: [['kode', 'Kode ICD-10'], ['nama', 'Diagnosis'], ['jumlah', 'Jumlah Kasus', 1]],
    obat: [['kode', 'Kode'], ['nama', 'Nama Obat'], ['jumlah', 'Jumlah Keluar', 1]]
  };
  const JUDUL = { kunjungan: 'Kunjungan', tagihan: 'Pendapatan', diagnosis: 'Diagnosis', obat: 'Obat Keluar' };

  App.halaman.laporan = {
    render(el) {
      const now = new Date(), st = { dari: F.iso(new Date(now.getFullYear(), now.getMonth(), 1)), sampai: F.iso(now), poli: '', tab: 'kunjungan', q: '', data: null, semua: false };
      el.innerHTML = `<div class="page-h"><div><h1 class="h-xl">${ik('analytics', 's28 teal')} Laporan &amp; Manajemen</h1><p>Rekap kunjungan, pendapatan, diagnosis, dan pemakaian obat. Data dibaca per rentang tanggal.</p></div>
          <div class="row wrap"><button class="btn secondary" id="lp-xlsx" data-sibuk="Menyiapkan…">${ik('table_view', 's18 teal')} Unduh Excel</button><button class="btn secondary" id="lp-pdf" data-sibuk="Menyiapkan…">${ik('picture_as_pdf', 's18 teal')} Unduh PDF</button></div></div>
        <div class="card mb-md"><div class="row wrap" style="gap:.75rem;align-items:flex-end">
          <div class="field"><label for="lp-dari">Dari</label><input class="inp white" type="date" id="lp-dari" value="${st.dari}"></div>
          <div class="field"><label for="lp-sampai">Sampai</label><input class="inp white" type="date" id="lp-sampai" value="${st.sampai}"></div>
          <div class="field"><label for="lp-poli">Poli</label><select class="sel white" id="lp-poli"><option value="">Semua poli</option>${App.poli().map((p) => `<option value="${esc(p.kode)}">${esc(p.nama)}</option>`).join('')}</select></div>
          <button class="btn primary" id="lp-cari">${ik('search', 's18')} Tampilkan</button>
          <div class="pills">${[['hari', 'Hari ini'], ['7', '7 hari'], ['bulan', 'Bulan ini'], ['lalu', 'Bulan lalu'], ['tahun', 'Tahun ini']].map(([k, l]) => `<button class="pill" data-cepat="${k}">${l}</button>`).join('')}</div></div></div>
        <div id="lp-isi">${UI.skel(6)}</div>`;
      const muat = async (paksa) => {
        st.dari = $('#lp-dari', el).value; st.sampai = $('#lp-sampai', el).value; st.poli = $('#lp-poli', el).value;
        $('#lp-isi', el).innerHTML = `<div class="grid g4 mb-md">${'<div class="card"><div class="skel" style="height:70px"></div></div>'.repeat(4)}</div>${UI.skel(5)}`;
        const r = await api('laporan.data', { dari: st.dari, sampai: st.sampai, poli: st.poli, _fresh: !!paksa });
        if (!r.success) { $('#lp-isi', el).innerHTML = `<div class="note danger">${ik('error', 's18')} ${esc(r.message)}</div>`; return; }
        st.data = r.data; gambar();
      };
      function gambar() {
        const d = st.data, R = d.ringkas, pm = App.poliMap();
        $('#lp-isi', el).innerHTML = `
          ${d.terpotong ? `<div class="note mb-md">${ik('info', 's18')}<span>Rentang ini memuat lebih dari 3.000 baris; tabel menampilkan 3.000 baris terakhir. Angka ringkasan & grafik tetap dihitung dari seluruh data.</span></div>` : ''}
          <div class="grid g4 mb-md">
            <div class="card kpi"><span class="eyebrow">Kunjungan</span><span class="v">${F.angka(R.kunjungan)}</span><div class="foot"><span>${F.angka(R.pasienUnik)} pasien unik</span><span>${F.angka(R.batal)} batal</span></div></div>
            <div class="card kpi"><span class="eyebrow">Pendapatan diterima</span><span class="v" style="font-size:24px">${F.rp(R.pendapatan)}</span><div class="foot"><span>dibayar pasien</span></div></div>
            <div class="card kpi"><span class="eyebrow">Ditanggung penjamin</span><span class="v" style="font-size:24px">${F.rp(R.ditanggung)}</span><div class="foot"><span>BPJS / asuransi (klaim)</span></div></div>
            <div class="card kpi"><span class="eyebrow">Belum dibayar</span><span class="v" style="font-size:24px">${F.rp(R.belumBayar)}</span><div class="foot"><span>tagihan terbuka</span></div></div>
          </div>
          <div class="grid g2 mb-md">
            <div class="card"><div class="card-h"><h3>${ik('bar_chart')} Kunjungan Harian</h3><span class="t-xs muted">${esc(F.tgl(d.dari))} – ${esc(F.tgl(d.sampai))}</span></div><div id="lg-k"></div></div>
            <div class="card"><div class="card-h"><h3>${ik('payments')} Pendapatan Harian</h3><span class="t-xs muted">dibayar pasien + ditanggung</span></div><div id="lg-p"></div></div>
            <div class="card"><div class="card-h"><h3>${ik('local_hospital')} Kunjungan per Poli</h3></div><div id="lg-poli"></div></div>
            <div class="card"><div class="card-h"><h3>${ik('coronavirus')} Diagnosis Terbanyak</h3></div><div id="lg-dx"></div></div>
            <div class="card"><div class="card-h"><h3>${ik('verified')} Kunjungan per Penjamin</h3></div><div id="lg-pj"></div></div>
            <div class="card"><div class="card-h"><h3>${ik('account_balance_wallet')} Nilai per Metode Bayar</h3></div><div id="lg-mt"></div></div>
          </div>
          <div class="card pad-0"><div class="tabs" style="padding:0 1rem;margin:0">${Object.keys(KOLOM).map((k) => `<button class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${esc(JUDUL[k])} (${(k === 'kunjungan' ? d.kunjungan : k === 'tagihan' ? d.tagihan : d[k]).length})</button>`).join('')}</div>
            <div class="row between wrap" style="padding:.75rem 1.25rem"><div class="inp-wrap" style="width:260px">${ik('filter_list')}<input class="inp" id="lp-q" placeholder="Saring tabel…" value="${esc(st.q)}"></div><button class="btn sm secondary" id="lp-csv">${ik('download', 's16')} CSV tab ini</button></div>
            <div class="tbl-wrap"><table class="tbl compact" id="lp-tbl"></table></div><div class="tbl-foot" id="lp-foot"></div></div>`;
        // Deret waktu lengkap: per hari (≤ 92 hari, hari kosong = 0) atau per bulan untuk rentang panjang.
        const seri = (() => {
          const peta = {}; d.harian.forEach((h) => { peta[h.tanggal] = h; });
          const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
          const a = new Date(d.dari + 'T00:00:00'), b = new Date(d.sampai + 'T00:00:00'), n = Math.round((b - a) / 864e5) + 1, out = [];
          if (n <= 92) {
            for (let i = 0; i < n; i++) { const t = new Date(a); t.setDate(a.getDate() + i); const k = iso(t), h = peta[k] || {}; out.push({ label: F.tgl(k).split(' ').slice(0, 2).join(' '), judul: F.tgl(k), k: h.kunjungan || 0, p: (h.pendapatan || 0) + (h.ditanggung || 0) }); }
            return { out, skala: 'hari' };
          }
          const bln = {}; d.harian.forEach((h) => { const k = h.tanggal.slice(0, 7), o = bln[k] || (bln[k] = { k: 0, p: 0 }); o.k += h.kunjungan; o.p += h.pendapatan + h.ditanggung; });
          for (let t = new Date(a.getFullYear(), a.getMonth(), 1); t <= b; t.setMonth(t.getMonth() + 1)) { const k = iso(t).slice(0, 7), o = bln[k] || { k: 0, p: 0 }; out.push({ label: S.BULAN[t.getMonth()].slice(0, 3) + ' ' + String(t.getFullYear()).slice(2), judul: S.BULAN[t.getMonth()] + ' ' + t.getFullYear(), k: o.k, p: o.p }); }
          return { out, skala: 'bulan' };
        })();
        const per = seri.skala === 'hari' ? 'harian' : 'bulanan';
        $('#lg-k', el).closest('.card').querySelector('h3').lastChild.textContent = ' Kunjungan ' + (per === 'harian' ? 'Harian' : 'Bulanan');
        $('#lg-p', el).closest('.card').querySelector('h3').lastChild.textContent = ' Pendapatan ' + (per === 'harian' ? 'Harian' : 'Bulanan');
        Grafik.kolom($('#lg-k', el), seri.out.map((x) => ({ label: x.label, judul: x.judul, nilai: x.k })), { tinggi: 200, judul: 'Kunjungan ' + per, format: (v) => F.angka(v) + ' kunjungan', labelNilai: seri.out.length <= 14, kosong: 'Belum ada kunjungan pada periode ini' });
        Grafik.kolom($('#lg-p', el), seri.out.map((x) => ({ label: x.label, judul: x.judul, nilai: x.p })), { tinggi: 200, judul: 'Pendapatan ' + per, format: F.rp, labelNilai: seri.out.length <= 14, kosong: 'Belum ada pembayaran pada periode ini' });
        Grafik.batang($('#lg-poli', el), d.perPoli.map((x) => ({ label: x.nama, nilai: x.jumlah })), { format: (v) => F.angka(v) + ' kunjungan' });
        Grafik.batang($('#lg-dx', el), d.diagnosis.slice(0, 8).map((x) => ({ kode: x.kode, label: x.nama, nilai: x.jumlah })), { format: (v) => F.angka(v) + ' kasus', kosong: 'Belum ada diagnosis final' });
        Grafik.batang($('#lg-pj', el), d.perPenjamin.map((x) => ({ label: x.nama, nilai: x.jumlah })).sort((a, b) => b.nilai - a.nilai), { format: (v) => F.angka(v) + ' kunjungan' });
        Grafik.batang($('#lg-mt', el), d.perMetode.map((x) => ({ label: x.nama, nilai: x.jumlah })).sort((a, b) => b.nilai - a.nilai), { format: F.rp, kosong: 'Belum ada pembayaran' });
        gambarTabel();
        $('#lp-q', el).addEventListener('input', S.debounce((e) => { st.q = e.target.value.trim(); st.semua = false; gambarTabel(); }, 150));
      }
      const barisTab = () => { const d = st.data, rows = st.tab === 'kunjungan' ? d.kunjungan : st.tab === 'tagihan' ? d.tagihan : d[st.tab], q = st.q.toLowerCase(); return q ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q)) : rows; };
      function gambarTabel() {
        const k = KOLOM[st.tab], rows = barisTab(), tampil = st.semua ? rows : rows.slice(0, 200);
        const tot = k.filter((c) => c[2]).map((c) => [c[0], rows.reduce((s, r) => s + (Number(r[c[0]]) || 0), 0)]);
        $('#lp-tbl', el).innerHTML = `<thead><tr>${k.map((c) => `<th class="${c[2] ? 'num' : ''}">${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${tampil.length ? tampil.map((r) => `<tr>${k.map((c) => `<td class="${c[2] ? 'num' : ''}">${c[2] && st.tab === 'tagihan' ? esc(F.angka(r[c[0]])) : c[0] === 'status' ? UI.badgeStatus(r[c[0]]) : c[0] === 'tanggal' ? esc(F.tgl(r[c[0]])) : esc(r[c[0]])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${k.length}">${UI.kosong('Tidak ada data', 'table_rows')}</td></tr>`}</tbody>
          ${tot.length && rows.length ? `<tfoot><tr>${k.map((c, i) => { const t = tot.find((x) => x[0] === c[0]); return `<td class="${c[2] ? 'num b' : 'b'}" style="border-top:2px solid var(--line)">${t ? esc(F.angka(t[1])) : i === 0 ? 'Total' : ''}</td>`; }).join('')}</tr></tfoot>` : ''}`;
        $('#lp-foot', el).innerHTML = `<span class="t-sm muted">${rows.length > tampil.length ? `Menampilkan ${tampil.length} dari ${rows.length} baris` : rows.length + ' baris'}</span>${rows.length > tampil.length ? '<button class="btn sm secondary" id="lp-semua">Tampilkan semua</button>' : ''}`;
      }
      async function excel(btn) {
        await UI.sibuk(btn, async () => {
          try { await muatSkrip('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'); } catch (e) { return UI.toast('Pustaka Excel gagal dimuat', 'Periksa koneksi internet.', 'err'); }
          const d = st.data, wb = XLSX.utils.book_new(), R = d.ringkas;
          const ring = [['Laporan SIMRS Mini', App.st().KLINIK_NAMA || ''], ['Periode', F.tgl(d.dari) + ' s.d. ' + F.tgl(d.sampai)], ['Poli', st.poli ? (App.poliMap()[st.poli] || {}).nama : 'Semua'], [], ['Kunjungan', R.kunjungan], ['Pasien unik', R.pasienUnik], ['Batal', R.batal], ['Pendapatan diterima (Rp)', R.pendapatan], ['Ditanggung penjamin (Rp)', R.ditanggung], ['Belum dibayar (Rp)', R.belumBayar], [], ['Tanggal', 'Kunjungan', 'Dibayar pasien (Rp)', 'Ditanggung (Rp)']].concat(d.harian.map((h) => [h.tanggal, h.kunjungan, h.pendapatan, h.ditanggung]));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ring), 'Ringkasan');
          Object.keys(KOLOM).forEach((k) => { const rows = k === 'kunjungan' ? d.kunjungan : k === 'tagihan' ? d.tagihan : d[k]; XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([KOLOM[k].map((c) => c[1])].concat(rows.map((r) => KOLOM[k].map((c) => r[c[0]])))), JUDUL[k]); });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Poli', 'Kunjungan']].concat(d.perPoli.map((x) => [x.nama, x.jumlah]))), 'Per Poli');
          XLSX.writeFile(wb, `Laporan-SIMRS-${d.dari}-sd-${d.sampai}.xlsx`);
        });
      }
      async function pdf(btn) {
        await UI.sibuk(btn, async () => {
          try { await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'); } catch (e) { return UI.toast('Pustaka PDF gagal dimuat', 'Periksa koneksi internet.', 'err'); }
          const d = st.data, R = d.ringkas, doc = new window.jspdf.jsPDF({ orientation: st.tab === 'tagihan' || st.tab === 'kunjungan' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
          const teal = [31, 111, 107];
          doc.setFontSize(14); doc.setTextColor(...teal); doc.text(App.st().KLINIK_NAMA || 'SIMRS Mini', 14, 16);
          doc.setFontSize(10); doc.setTextColor(60); doc.text(`Laporan ${JUDUL[st.tab]} • ${F.tgl(d.dari)} s.d. ${F.tgl(d.sampai)}${st.poli ? ' • ' + ((App.poliMap()[st.poli] || {}).nama || '') : ''}`, 14, 22);
          doc.autoTable({ startY: 27, head: [['Kunjungan', 'Pasien unik', 'Pendapatan diterima', 'Ditanggung penjamin', 'Belum dibayar']], body: [[F.angka(R.kunjungan), F.angka(R.pasienUnik), F.rp(R.pendapatan), F.rp(R.ditanggung), F.rp(R.belumBayar)]], theme: 'grid', headStyles: { fillColor: teal }, styles: { fontSize: 9 } });
          const k = KOLOM[st.tab], rows = barisTab();
          doc.autoTable({ startY: doc.lastAutoTable.finalY + 6, head: [k.map((c) => c[1])], body: rows.map((r) => k.map((c) => (c[2] && st.tab === 'tagihan' ? F.angka(r[c[0]]) : String(r[c[0]] === undefined ? '' : r[c[0]])))), theme: 'striped', headStyles: { fillColor: teal }, styles: { fontSize: 8 } });
          const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(130); doc.text(`Dicetak ${F.tglPanjang()} ${F.jam()} • Halaman ${i}/${n}`, 14, doc.internal.pageSize.getHeight() - 8); }
          doc.save(`Laporan-${JUDUL[st.tab]}-${d.dari}-sd-${d.sampai}.pdf`);
        });
      }
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.id === 'lp-cari') muat(true);
        if (b.dataset.cepat) {
          const n = new Date(), set = (a, z) => { $('#lp-dari', el).value = F.iso(a); $('#lp-sampai', el).value = F.iso(z); };
          ({ hari: () => set(n, n), 7: () => set(new Date(Date.now() - 6 * 864e5), n), bulan: () => set(new Date(n.getFullYear(), n.getMonth(), 1), n), lalu: () => set(new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)), tahun: () => set(new Date(n.getFullYear(), 0, 1), n) })[b.dataset.cepat]();
          muat(false);
        }
        if (b.dataset.tab) { st.tab = b.dataset.tab; st.q = ''; st.semua = false; $$('.tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); $('#lp-q', el).value = ''; gambarTabel(); }
        if (b.id === 'lp-semua') { st.semua = true; gambarTabel(); }
        if (!st.data) return;
        if (b.id === 'lp-csv') Berkas.unduhBlob(new Blob([Berkas.keCsv(barisTab(), KOLOM[st.tab].map((c) => ({ key: c[0], label: c[1] })))], { type: 'text/csv' }), `${JUDUL[st.tab]}-${st.data.dari}-sd-${st.data.sampai}.csv`);
        if (b.id === 'lp-xlsx') excel(b);
        if (b.id === 'lp-pdf') pdf(b);
      });
      muat(false);
    }
  };
})();
