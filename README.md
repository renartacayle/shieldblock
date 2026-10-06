# ShieldBlock - Manifest V3 Ad & Tracker Blocker

Ekstensi ad blocker modern, ringan, dan cepat berbasis **Chrome Manifest V3**.

---

## ✨ Fitur Utama
1. **Network-Level Blocking (`declarativeNetRequest`)**:
   - Memblokir 118+ domain ad network besar (Google AdSense/DoubleClick, PopAds, Outbrain, Taboola, PropellerAds, Adsterra, Criteo, dll.).
   - Sangat hemat memori CPU dan RAM karena diproses langsung oleh browser engine tanpa overhead script berat.
2. **Cosmetic Filtering (Element Hiding & Removal)**:
   - Menyembunyikan slot banner kosong dan container iklan di halaman web (`ins.adsbygoogle`, floating banner, video sticky ad container, dll.).
   - `MutationObserver` untuk mendeteksi dan menghapus iklan yang disuntikkan secara dinamis setelah halaman termuat.
3. **Special YouTube Ad Shield & Auto-Skipper**:
   - **Auto-Fast-Forward & Auto-Skip**: Otomatis mempercepat (16x speed), mute, dan menekan tombol *Skip Ad* secara instan saat iklan video muncul (pre-roll & mid-roll).
   - **Anti-Adblock Popup Bypass**: Mendeteksi dan menutup dialog peringatan adblock dari YouTube serta otomatis me-resume video.
   - **Feed & Sidebar Ad Removal**: Menghilangkan banner promo di beranda dan rekomendasi samping.
4. **Popup Interface Modern & Elegan**:
   - Status toggle On / Off global.
   - Tombol Whitelist / Izinkan iklan per situs (domain-specific).
   - Counter jumlah iklan yang diblokir pada halaman aktif & total keseluruhan.
   - Badge counter langsung di icon extension toolbar.

---

## 🚀 Cara Memasang (Install) di Browser

### Untuk Google Chrome / Edge / Brave / Opera:
1. Buka browser dan ketik alamat:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
2. Aktifkan **Developer mode** (Mode Pengembang) di pojok kanan atas.
3. Klik tombol **Load unpacked** (Muat yang belum dibongkar).
4. Pilih folder:
   `/home/rena/.gemini/antigravity/scratch/adblocker-extension`
5. Ekstensi **ShieldBlock** akan langsung aktif dan muncul di toolbar ekstensi browser kamu! 🎉

---

## 🧪 Cara Mengetes Ekstensi
1. Buka situs berita atau website yang banyak iklannya (misal: situs portal berita, streaming, atau blog).
2. Perhatikan ikon ShieldBlock di toolbar browser: angka counter iklan yang diblokir akan langsung muncul.
3. Klik ikon ShieldBlock untuk melihat ringkasan statistik atau mematikan pemblokiran di situs tertentu jika dibutuhkan.

---

## 🛠️ Menambah Domain Iklan Baru
Jika kamu menemukan domain iklan baru yang ingin diblokir:
1. Buka file `generate_rules.py`.
2. Tambahkan domain baru ke dalam array `ad_domains`.
3. Jalankan command:
   ```bash
   python3 generate_rules.py
   ```
4. Buka `chrome://extensions` dan klik ikon refresh (reload) pada ekstensi ShieldBlock.
