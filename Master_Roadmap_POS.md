# Master Roadmap & Checklist Optimasi POS Bakung

Dokumen ini adalah checklist komprehensif bagi Anda (atau AI Agent lain) untuk melanjutkan pengembangan POS Bakung. Item dengan centang `[x]` sudah diselesaikan oleh sesi AI sebelumnya.

---

## 🔴 SPRINT 1: BUG KRITIS & CORE LOGIC
Prioritas utama untuk memastikan integritas data transaksi dan profitabilitas.

- [x] **Fix: Pembatalan Transaksi (Cancel Order) Tidak Mengembalikan Stok**
  - Diimplementasi di `src/lib/stock-deduction.js` (Fungsi `restoreStockForCancelledOrder`).
  - Diimplementasi di `src/app/api/orders/[id]/status/route.js` (Memanggil fungsi restore ketika order dipindah ke status CANCELLED).
- [x] **Fix: Shift Overlap Validation**
  - Diimplementasi di `src/app/api/shifts/start/route.js` (Menambah validasi `user_id` agar user yang sama tidak bisa membuka lebih dari satu shift dalam waktu bersamaan).
- [x] **Feature: Laporan Laba Rugi (P&L) Sederhana**
  - **Lokasi**: Perlu dibuat di `src/app/(dashboard)/finance/page.js` atau komponen baru.
  - **Task**: 
    1. Buat interface untuk menampilkan `Net Profit` (Profit Bersih).
    2. Formula: `(Total Gross Revenue) - (COGS) - (Total Expenses) = Net Profit`.
    3. Ambil data expenses dari `tabel Expense` dan gabungkan dengan pendapatan + HPP dari endpoint `/api/dashboard/insights` atau buat endpoint P&L khusus.
- [x] **Feature: Alert Stok Menipis**
  - **Lokasi**: Dashboard Summary / Top Bar.
  - **Task**: Gunakan field `minimum_stock` di tabel Ingredient. Beri badge merah jika `stock <= minimum_stock`.

---

## 🟠 SPRINT 2: HIGH VALUE OPERASIONAL UMKM
Fitur untuk membantu owner memantau dan mengamankan usahanya.

- [x] **Feature: Laporan Rekap Akhir Hari (End-of-Day Summary)**
  - **Lokasi**: `/reports/end-of-day` (atau sejenis).
  - **Task**: Buat satu halaman ringkasan yang berisi total transaksi, kas masuk, pengeluaran shift, profit, dan top menu khusus untuk print saat tutup toko.
- [x] **Feature: Pemisahan Komisi Platform di Finance**
  - **Lokasi**: `/finance`.
  - **Task**: Buat metrik khusus yang memperlihatkan berapa biaya (komisi) yang ditarik oleh GrabFood/GoFood vs Pendapatan aktual yang cair (Net Revenue).
- [x] **Feature: "Top Menus by Profit" (Bukan hanya by volume)**
  - **Lokasi**: Dashboard Top Menus.
  - **Task**: Tambahkan toggle di Dashboard untuk melihat top menu berdasarkan QTY Terjual vs berdasarkan Total Profit.
- [x] **Fix: Validasi `is_open` (Mode Toko Tutup)**
  - **Lokasi**: API Order Creation.
  - **Task**: Jika `is_open` (diambil dari `StoreConfig`) adalah `false`, blokir pembuatan transaksi baru agar kasir tidak curang melakukan input setelah tutup.

---

## 🟡 SPRINT 3: WORKFLOW KASIR & DAPUR
- [x] **Feature: Export ke PDF & WhatsApp**
  - **Lokasi**: Komponen Laporan (Shift, End-of-Day, Finance).
  - **Task**: Gunakan library `html2pdf.js` atau `jspdf` untuk ekspor laporan. Buat tombol share to WA dengan pre-filled text (URL scheme: `https://wa.me/?text=...`).
- [x] **Feature: Integrasi Catatan Per-Item Menu (Untuk Dapur)**
  - **Lokasi**: Tabel `OrderItem`, UI POS Kasir, dan `src/app/api/orders/route.js`.
  - **Task**: Pastikan field `note` di `OrderItem` muncul saat nge-print tiket ke dapur agar koki tahu catatan alergi atau preferensi khusus per item.
- [x] **Feature: Analitik Jam Ramai (Peak Hour)**
  - **Lokasi**: Halaman Dashboard / Insights.
  - **Task**: Buat grafik bar yang memperlihatkan volume transaksi per jam (08:00, 12:00, 18:00) agar owner bisa mengatur shift karyawan.

---

## 🟢 SPRINT 4: TAHAPAN LANJUTAN STRATEGIS
- [x] **Feature: Offline / Low-Connection Mode**
  - **Task**: Simpan menu catalog dan data setting di IndexedDB/Local Storage agar kasir tetap terbuka saat WiFi mati sebentar.
- [x] **Feature: Table Management**
  - **Task**: Tambahkan field string `table_number` ke Order dan izinkan Kasir memasukkan nomor antrean/nomor meja.
- [x] **Feature: Pencatatan Kasbon / Hutang Pelanggan (Tab)**
  - **Task**: Tambahkan opsi pembayaran "Pay Later / Kasbon" dengan input nama pelanggan.

---

### 📝 Cara Menggunakan Checklist Ini Dengan AI Lain
Jika token mulai terbatas atau pindah sesi, Anda bisa berikan file ini (`Master_Roadmap_POS.md`) kepada AI Agent yang baru, lalu perintahkan:
> *"Tolong kerjakan centang selanjutnya yang kosong di bagian SPRINT 1 pada file Master_Roadmap_POS.md."*
