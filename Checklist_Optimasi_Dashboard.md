# Checklist Audit & Optimasi Dashboard

Dokumen ini berisi daftar hal-hal teknis yang perlu diperiksa dan diimplementasikan untuk mengatasi masalah loading lambat pada dashboard Anda.

---

## 1. Strategi Data Fetching (Prioritas Utama)
- [x] **Implementasi Client-Side Caching:** Gunakan library seperti **TanStack Query (React Query)** atau **SWR**.
- [x] **Server-Side Pagination:** Jangan pernah menarik semua data sekaligus. (Sudah diimplementasi di API Menus).
- [x] **Eliminasi Waterfall Request:** (Sudah diimplementasi di Dashboard, Settings, dan Recipe Editor).
- [ ] **Optimasi Payload JSON:** Sedang ditinjau pada API Transaksi. 

## 2. Optimasi Rendering (Frontend)
- [ ] **Windowing / Virtualization:** Jika tabel memiliki lebih dari 50 baris, gunakan `react-window` atau `tanstack-virtual`.
- [x] **Lazy Loading Komponen Berat:** (Sudah diterapkan pada Dashboard Charts dan Settings Tabs).
- [x] **Memoization:** (Sudah diimplementasi di Recipes dan Order History).

## 3. Optimasi Database & Backend
- [x] **Database Indexing:** (Sudah diterapkan pada tabel Consignment Logs).
- [ ] **Pre-aggregated Data:** (Sudah ada infrastruktur DailySummary di Dashboard).
- [ ] **Gzip/Brotli Compression:** (Tergantung konfigurasi deployment).

## 4. Perceived Performance (User Experience)
- [x] **Skeleton Screens:** (Tersedia global di ResponsiveDataView dan Stats Cards).
- [x] **Optimistic Updates:** (Sudah diterapkan pada Finance dan Products).
- [ ] **Initial Data Pre-fetching:** Gunakan `getStaticProps` atau `getServerSideProps` untuk data yang jarang berubah agar saat halaman terbuka, data dasar sudah tersedia.

---
*Gunakan checklist ini sebagai panduan audit teknis untuk tim developer atau untuk pengecekan mandiri.*
