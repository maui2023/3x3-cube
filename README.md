# 🎲 Penyelesai Kiub 3x3 (Kamera) / 3x3 Rubik's Cube Solver

[![Node.js Test Suite](https://img.shields.io/badge/tests-23%20passed-success?style=flat-square)](tests/engine.test.js)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-blue?style=flat-square)](manifest.json)
[![Deployment](https://img.shields.io/badge/deploy-GitHub%20Pages-brightgreen?style=flat-square)](https://pages.github.com/)
[![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)](LICENSE)

> **Bilingual Documentation:** [🇲🇾 Bahasa Melayu](#-bahasa-melayu) • [🇬🇧 English](#-english)

---

## 🇲🇾 Bahasa Melayu

Aplikasi web moden mesra telefon pintar untuk mengimbas dan menyelesaikan kiub Rubik 3x3 menggunakan kamera telefon. Dilengkapi pengesanan warna CIELAB, panduan putaran fizikal kiub, pembetulan warna manual, dan pemain langkah demi langkah interaktif dengan bentangan 2D kiub. 100% beroperasi di pelayar pengguna (Serverless) dan boleh dipasang sebagai aplikasi luar talian (PWA).

### ✨ Ciri-Ciri Utama

1. **Reka Bentuk Responsif Mesra Telefon (Mobile-First UX):**
   - Ketinggian skrin dikunci (`100dvh`) dengan sokongan penuh takuk skrin (`safe-area-inset`) untuk iOS (iPhone) dan Android.
   - Susun atur mesra ibu jari (thumb-friendly): Pemidang tilik kamera di bahagian atas, butang kawalan pantas di bahagian bawah.
   - Tema gelap berprestasi tinggi dengan kontras tajam.

2. **Sistem Dwibahasa (🇲🇾 BM / 🇬🇧 EN):**
   - Pilihan bahasa lalai adalah **Bahasa Melayu**, dengan butang pertukaran ke Bahasa Inggeris di bahagian atas.
   - Terjemahan lengkap untuk arahan muka, langkah pusingan (*"Pusing kanan lawan jam"*, *"Condongkan kiub"*), mesej ralat, dan panduan kamera.

3. **Pemidang Tilik Kamera Pintar & Pembantu Putaran Kiub:**
   - Kamera belakang automatik (`facingMode: { ideal: "environment" }`) dengan suis lampu suluh (torch/flash) dan suis tukar kamera.
   - Garis retikel 3x3 berketepatan tinggi dengan titik penunjuk warna masa nyata (*live center indicator*).
   - **Pembantu Putaran Kiub Visual:** Rajah isometrik 3D mini yang menunjukkan arah fizikal memusing kiub dari satu muka ke muka seterusnya (Langkah 1: U, Langkah 2: R, Langkah 3: F, Langkah 4: D, Langkah 5: L, Langkah 6: B).

4. **Palet Pembetulan Pelekat Manual (Manual Sticker Correction):**
   - Paparan kad imbasan untuk setiap muka kiub.
   - Jika pantulan cahaya atau bayang mengelirukan kamera, pengguna boleh mengetik mana-mana pelekat untuk membuka pemilih warna pantas (6 warna).
   - Penunjuk keseimbangan warna masa nyata memastikan tepat 9 kotak bagi setiap warna (Putih, Merah, Hijau, Kuning, Jingga, Biru).

5. **Pemain Langkah Penyelesaian Interaktif (2D Cube Net Player):**
   - Butang kawalan sentuh besar: **Undur (Prev)**, **Main/Jeda (Play/Pause)**, **Maju (Next)**, dan **Mula Semula (Reset)**.
   - Lencana langkah besar dengan terjemahan bahasa mudah (contohnya `R'` -> *"Pusing muka Kanan lawan arah jam (90°)"*).
   - **Bentangan 2D Interaktif:** Gambar rajah bentangan salib 2D kiub (*classic unfolded net*) yang mengemas kini kedudukan 54 warna pelekat secara dinamik pada setiap langkah.
   - Peluncur kelajuan main balik (200ms - 1600ms).

6. **Enjin Kociemba Dua Fasa (Web Worker):**
   - Algoritma carian Kociemba Dua Fasa dijalankan dalam *Web Worker* latar belakang bagi mengelakkan skrin telefon tersangkut (*zero dropped frames*).
   - Penyelesaian optimum dalam masa < 200ms (kebiasaannya 18-22 pusingan).

7. **Sokongan PWA Luar Talian (100% Offline):**
   - Dilengkapi `manifest.json` dan *Service Worker* (`sw.js`).
   - Boleh ditambah ke skrin utama telefon pintar dan digunakan sepenuhnya tanpa sambungan internet.

---

## 🇬🇧 English

A mobile-first progressive web application for scanning and solving 3x3 Rubik's cubes using your phone's camera. Features adaptive CIELAB color classification, visual physical rotation guidance, manual sticker correction palette, and an interactive step-by-step player with a dynamic 2D unfolded cube net. 100% client-side execution (Serverless) with offline PWA support.

### ✨ Key Features

1. **Mobile-First Responsive Layout & Thumb-Zone UX:**
   - Viewport lock (`100dvh`) with native notch and home-bar padding (`safe-area-inset`) for iOS and Android.
   - Single-column thumb-friendly layout: Viewfinder up top, floating action buttons at the bottom.
   - High-contrast dark theme optimized for indoor room lights and outdoor sunlight.

2. **Bilingual Localization System (🇲🇾 BM / 🇬🇧 EN):**
   - Default language: **Bahasa Melayu (`ms`)**, instant toggle to **English (`en`)** in the header.
   - Plain-language move descriptions (e.g. `R'` -> *"Turn Right face counter-clockwise (90°)"*), rotation steps, and parity error diagnostics.

3. **Interactive Viewfinder & Cube Rotation Assistant:**
   - Back-camera default (`facingMode: { ideal: "environment" }`) with torch/flashlight toggle and camera flip.
   - 3x3 square reticle with live center color sampling dot.
   - **Visual Cube Rotation Assistant:** Miniature isometric 3D diagram showing exact physical rotation gestures between faces:
     - Step 1 (U): White face on top, Green in front.
     - Step 2 (R): Rotate cube 90° left (Red face in front).
     - Step 3 (F): Rotate cube 90° right back to Green face.
     - Step 4 (D): Tilt cube upwards to scan Yellow face on bottom.
     - Step 5 (L): Rotate to Orange face.
     - Step 6 (B): Rotate to Blue face.

4. **Manual Sticker Color Correction Palette:**
   - Tap any captured face card or sticker to trigger the bottom-sheet color editor.
   - 6-color quick palette allows manual overrides if room shadows distort color detection.
   - Live color distribution badges display exact sticker counts (`9/9` for each color).

5. **Step-by-Step Solution Player (Interactive 2D Net):**
   - Large touch controls: **Prev (Undur)**, **Play/Pause (Main/Jeda)**, **Next (Maju)**, **Reset (Mula Semula)**.
   - Large move badge accompanied by plain language explanation.
   - **Interactive 2D Unfolded Cube Net:** Classic cross-layout displaying real-time simulation of all 54 stickers as moves progress.
   - Adjustable playback speed slider (200ms - 1600ms).

6. **Web Worker Kociemba Two-Phase Engine:**
   - Heavy combinatorial search executes in a dedicated Web Worker to prevent mobile UI stuttering.
   - Built-in parity and distribution validator rejects impossible scrambles before solving.

7. **Progressive Web App (PWA):**
   - Installable on mobile home screens with offline caching via `sw.js`.

---

## 🚀 Panduan Pengaktifan GitHub Pages / GitHub Pages Activation Guide

Aplikasi ini dibina 100% menggunakan seni bina statik tanpa pelayan (*serverless static architecture*). Tiada backend Node.js atau pangkalan data diperlukan semasa penggunaan web.

### Langkah-langkah / Step-by-Step:

1. **Muat naik kod ke repositori GitHub / Push code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: complete mobile-first 3x3 cube solver"
   git push origin main
   ```

2. **Buka Tetapan Repositori / Open Repository Settings:**
   - Pergi ke tab **Settings** di bahagian atas repositori GitHub anda.
   - Pada menu bar sisi kiri, klik **Pages** (di bawah seksyen *Code and automation*).

3. **Tetapkan Sumber Penerbitan / Set Build & Deployment Source:**
   - Di bawah bahagian **Source**, pilih **Deploy from a branch**.
   - Pada dropdown **Branch**, pilih `main` dan folder `/ (root)`.
   - Klik butang **Save**.

4. **Pengesahan Selesai / Done:**
   - Tunggu 1-2 minit untuk GitHub Pages selesai memproses.
   - Pautan aplikasi anda akan sedia dilayari di:
     `https://<username>.github.io/<repo-name>/`
   - GitHub Pages menyediakan sijil keselamatan **HTTPS** secara percuma dan automatik (ini wajib untuk fungsi kamera telefon!).

---

## 📷 Panduan Kebenaran Kamera Telefon / Mobile Camera Permissions Troubleshooting

Pelayar web moden (Safari iOS & Google Chrome Android) mengetatkan akses perkakasan kamera untuk melindungi privasi pengguna. Sila rujuk panduan di bawah jika kamera tidak dipaparkan:

### 1. Keperluan Sambungan Selamat HTTPS (HTTPS Requirement)
- API kamera (`navigator.mediaDevices.getUserMedia`) **hanya dibenarkan** pada sambungan selamat `https://` atau persekitaran tempatan `http://localhost`.
- Jika dibuka melalui alamat IP biasa (contohnya `http://192.168.x.x`), pelayar web akan menyekat kamera secara automatik. Sila gunakan domain GitHub Pages ber-HTTPS atau hos tempatan `localhost`.

### 2. Apple iOS (Safari & iPhone / iPad)
- **Kebenaran Laman:** Apabila Safari memaparkan tetingkap *"Would you like to use the camera?"*, ketik **Allow**.
- **Jika Tertekan Block / Tidak Sengaja Ditutup:**
  1. Ketik ikon **AA** atau tetapan laman di sebelah kiri palang URL Safari.
  2. Pilih **Website Settings** (Tetapan Laman Web).
  3. Di bawah pilihan **Camera**, tukar daripada *Ask / Deny* kepada **Allow**.
  4. Muat semula halaman (*refresh*).
- **Tetapan Sistem iOS:** Buka *Settings* iPhone -> *Safari* -> *Camera* -> Pilih *Ask* atau *Allow*.

### 3. Android (Google Chrome)
- **Kebenaran Tapak:** Ketik ikon pelindung/kunci di sebelah kiri palang URL -> Ketik **Permissions** -> Aktifkan suis **Camera**.
- **Tetapan Sistem Android:**
  1. Buka *Settings* telefon -> *Apps* -> *Chrome*.
  2. Pilih *Permissions* -> *Camera*.
  3. Pilih **Allow only while using the app**.
- **Lampu Suluh (Torch):** Butang lampu suluh menyala disokong pada Chrome Android bagi peranti yang mempunyai lampu LED belakang.

### 4. Tips Pengecaman Warna Kiub (Lighting Tips)
- Pastikan kiub menerima pencahayaan bilik yang sekata tanpa bayang tangan yang gelap.
- Jarakkan kiub kira-kira 15 - 25 cm daripada lensa kamera supaya 9 petak berada kemas dalam petak retikel.
- Jika warna Merah dan Jingga sukar dibezakan akibat lampu kuning hangat, ketik petak tersebut pada skrin untuk membuka **Palet Pembetulan Manual** dan pilih warna sebenar.

---

## 🛠️ Pembangunan Tempatan & Ujian / Local Development & Testing

Untuk menjalankan ujian unit enjin atau menguji kod secara tempatan:

### Menjalankan Ujian Automatik (Unit Tests):
```bash
# Menjalankan kesemua 23 ujian unit (Node.js built-in test runner)
npm test
```

### Menjalankan Pelayan Web Tempatan (Local Server):
```bash
# Menggunakan npx serve
npx serve .

# Atau menggunakan Python 3
python3 -m http.server 8000
```
Buka pelayar web di `http://localhost:8000`.

---

## 📂 Struktur Fail Projek / File Structure

```
3x3-cube/
├── index.html               # Halaman utama aplikasi (Mobile-first viewport)
├── style.css                # CSS Variables, tema gelap, token reka bentuk & 100dvh lock
├── app.js                   # Logik interaktif UI, kamera, panduan putaran & pemain 2D
├── manifest.json            # Konfigurasi PWA (Progressive Web App)
├── sw.js                    # Service Worker (Carian luar talian & cache)
├── SPEC.md                  # Spesifikasi seni bina & kontrak sistem
├── README.md                # Dokumentasi dwibahasa & panduan GitHub Pages
├── src/
│   ├── i18n.js              # Kamus dwibahasa (Bahasa Melayu & English)
│   └── engine/
│       ├── storage.js       # Pengurusan storan (localStorage dengan memory fallback)
│       ├── color-engine.js  # Pengelasan warna CIELAB & kalibrasi dinamik
│       ├── validator.js     # Pengesah 54 petak, taburan 9/warna & pariti kiub
│       ├── solver-worker.js # Web Worker enjin Kociemba Dua Fasa
│       └── lib/
│           └── cube-bundle.js # Pustaka algoritma Kociemba kendiri (zero dependencies)
└── tests/
    └── engine.test.js       # 23 ujian unit automatik (Node.js Test Runner)
```

---

## 📄 Lesen / License

Dilesenkan di bawah [Lesen MIT](LICENSE). Bebas digunakan, diubah suai dan diedarkan untuk tujuan pendidikan serta komersial.
