# 🚀 Pixel Art Rocket Launch Benchmark: Claude Opus 5.5 vs Gemini 4 Argon

> **Dual Agent 1-Shot Benchmark Showcase**  
> Dibuat oleh: **Rixsan Joulfiand** (Joulfiand Studio)  
> Repository Publik: [`https://github.com/rjoulfiand-afk/NrTO`](https://github.com/rjoulfiand-afk/NrTO)

---

## 📄 Prompt Eksperimen / Experiment Prompt

Prompt yang sama persis diberikan ke kedua model AI (**Claude Opus 5.5** dan **Gemini 4 Argon**) dalam satu kali kirim (*1-shot, zero human intervention*):

```text
Buat video animasi pixel art vertikal berdurasi 12 detik, sepenuhnya dari kode.

Tema: peluncuran roket kecil dari bumi ke orbit.

Struktur 3 adegan:
1. (0-4 dtk) Landasan peluncuran saat senja. Hitung mundur 3-2-1 sebagai teks pixel di layar. Asap kecil keluar dari dasar roket.
2. (4-8 dtk) Roket lepas landas. Kamera mengikuti ke atas, langit berubah dari oranye ke biru tua lalu hitam. Bintang mulai muncul.
3. (8-12 dtk) Roket mencapai orbit. Planet besar di latar, bintang berkelip, teks pixel "MISSION START" muncul dengan efek ketik.

Ketentuan teknis:
- Murni HTML Canvas 2D, tanpa library, gambar, atau aset eksternal.
- Resolusi internal 270x480, ditampilkan 1080x1920 dengan nearest-neighbor (piksel tajam, tidak blur).
- 30 fps, 360 frame. Semua animasi digerakkan oleh waktu (fungsi drawFrame(t)) supaya hasil render konsisten setiap dijalankan.
- Render frame demi frame dengan Playwright headless Chromium, lalu gabungkan jadi MP4 dengan ffmpeg.
- Palet warna terbatas (maksimal 16 warna) dan konsisten antar adegan.
- Tambahkan musik latar sederhana dan efek suara peluncuran yang dibuat dari kode, lalu gabungkan ke video.

Keluaran akhir: file source code siap render dan petunjuk cara menjalankannya. Jalankan sendiri, periksa hasilnya, dan perbaiki jika ada error sebelum menyerahkan.
```

---

## 🔬 Spesifikasi & Ringkasan Hasil Uji

| Parameter | Spesifikasi Brief | Implementasi Gemini 4 Argon | Implementasi Claude Opus 5.5 |
| :--- | :--- | :--- | :--- |
| **Durasi Video** | 12.0 Detik Murni | 12.0 Detik (360 Frame @ 30 FPS) | 12.0 Detik (360 Frame @ 30 FPS) |
| **Resolusi Internal** | 270 × 480 px | 270 × 480 px (4X Nearest-Neighbor) | 270 × 480 px (4X Nearest-Neighbor) |
| **Resolusi Output** | 1080 × 1920 px (9:16 Vertikal) | 1080 × 1920 px | 1080 × 1920 px |
| **Arsitektur Kode** | Murni Kode (HTML5 / JS) | Monolitik 1-File (`animation.html`) | Modular 6-Modul ES6 (`src/*.js`) |
| **Rendering Engine** | Canvas 2D | HTML5 Canvas 2D Offscreen | Custom Framebuffer (`Uint8Array`) |
| **Batas Palet Warna** | Maksimal 16 Warna Konsisten | Palet 16 Warna (Warm Earthy Retro) | Palet 16 Warna (Cosmic High-Contrast) |
| **Audio SFX** | Sintesis Kode Prosedural | Web Audio API Chiptune (44.1 kHz) | Web Audio API Chiptune (44.1 kHz) |

---

## 📂 Struktur File Utama

```
NrTO/
├── README.md               # Dokumentasi lengkap & Prompt eksperimen
├── animation.html          # Implementasi otentik Gemini 4 Argon (Monolith Canvas2D)
├── claude.html             # Implementasi otentik Claude Opus 5.5 (Modular Uint8Array)
├── page1.html              # Halaman 1: Pengetikan prompt & pengiriman
├── page2.html              # Halaman 2: Audit spek, X-ray scanner, & palet 16 warna
├── pict.html               # Halaman 3: Perbandingan video sejajar (Side-by-side)
├── page4.html              # Halaman 4: Analisis forensik, data, harga, & outro viral
├── render_final.js         # Script render video lengkap
├── render_page4.js         # Script render khusus Halaman 4
└── package.json            # Konfigurasi dependensi (Playwright, FFmpeg)
```

---

## 🛠️ Cara Menjalankan & Merender

1. **Install dependensi**:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Render Video Final Halaman 4**:
   ```bash
   node render_page4.js
   ```

3. **Preview Interaktif Browser**:
   Buka file `page4.html`, `pict.html`, atau `final.html` langsung di browser Chrome/Edge.

---

*Hak Cipta © 2026 Rixsan Joulfiand · Joulfiand Studio. Seluruh hak cipta dilindungi undang-undang.*
