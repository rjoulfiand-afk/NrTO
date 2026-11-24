# 🚀 Pixel Art Rocket Launch Benchmark: Claude Opus 5.5 vs Gemini 4 Carbon

> **Dual Agent 1-Shot Code & Visual Benchmark Showcase (198s Master Video)**  
> Dibuat oleh: **Rixsan Joulfiand** ([Joulfiand Studio](https://github.com/rjoulfiand-afk))  
> Repository Resmi: [`https://github.com/rjoulfiand-afk/NrTO`](https://github.com/rjoulfiand-afk/NrTO)

---

## 📌 Ringkasan Proyek

Eksperimen pengetesan kemampuan dua model kecerdasan buatan terdepan—**Claude Code (Opus 5.5)** dan **Gemini Agent (Gemini 4 Carbon · High Reasoning)**—dalam menghasilkan animasi peluncuran roket pixel art dari kode murni HTML Canvas 2D dalam **satu kali instruksi (1-shot, 0 revisi)**.

Seluruh alur video, perbandingan visual, audit terminal, dan ulasan kurator disatukan ke dalam arsitektur rendering berbasis web (HTML5 Canvas 2D) dan di-render secara deterministik frame demi frame menggunakan Playwright dan FFmpeg.

---

## 📄 Prompt Eksperimen (1-Shot · Zero Human Intervention)

Prompt di bawah ini diberikan secara serentak dan identik ke kedua model AI:

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

## 🔬 Rekapitulasi Data & Penilaian Objektif

| Metrik Penilaian | Claude Opus 5.5 (Roger 🧡) | Gemini 4 Carbon (Merry 💙) | Keterangan & Catatan Juri (Arto) |
| :--- | :---: | :---: | :--- |
| **Lolos Poin Brief** | **16 / 16** | 15 / 16 | Claude taat 100% pada batasan, Gemini melebihi kuota palet |
| **Warna Unik** | **16 warna** | 16.458 warna | Claude disiplin palet retro; Gemini memakai dithering & gradasi bebas |
| **Klaim README** | **Sesuai** | Tidak Sesuai | Gemini mengklaim palet terbatas, namun kode merender ribuan shade |
| **Deterministik** | **12.0s / 12.0s** | **12.0s / 12.0s** | Keduanya konsisten dikendalikan oleh fungsi `drawFrame(t)` |
| **Error Console** | **0 Error** | **0 Error** | Kedua kode tereksekusi mulus tanpa runtime exception |
| **Elemen Ekstra** | 4 elemen | 9 elemen | Gemini menambahkan satelit, panel surya, bulan, telemetry radar |
| **Total Baris Kode** | 1.062 baris | 1.679 baris | Claude lebih ringkas dan modular; Gemini kaya detail visual |
| **Biaya Langganan (Bulanan)** | **$20 USD**<br>*(~Rp 400.000 / bln sudah termasuk pajak tagihan user)* | **Rp 309.000**<br>🔥 **Promo Diskon 75%: Rp 77.250 / bln** | Google AI Pro menawarkan harga resmi Rp 309.000 dengan promo diskon 75% menjadi Rp 77.250/bulan. Gemini 4 Carbon juga dapat diakses gratis via Google AI Studio *(dibatasi kuota harian)*. |

---

## 🎬 Alur Struktur Halaman & Script Render (198 Detik)

| No | Modul Halaman | Durasi | Skrip Render Playwright | Deskripsi & Konten Visual |
| :-: | :--- | :-: | :--- | :--- |
| **00** | `intro.html` | 46.0s | `render_intro.js` | Pengenalan maskot Roger & Merry, drama senggol panggung, dual terminal setup & konfigurasi engine (Claude Opus 5.5 vs Gemini 4 Carbon). |
| **01** | `page1.html` | 26.0s | `render_page1.js` | Tampilan editor `prompt.txt`, pengetikan dinamis, scanner iris kuning membidik 5 poin spesifikasi, dan stempel emas *1× KIRIM · 0 REVISI*. |
| **02** | `page2.html` | 32.0s | `render_page2.js` | Live audit metrik terminal, scanner X-Ray kode, dan visualisasi pemetaan palet 16 warna. |
| **03** | `pict.html` | 12.0s | `render_pict.js` | Penayangan video hasil animasi peluncuran roket 12 detik secara berdampingan (*side-by-side showdown*). |
| **04** | `page4.html` | 54.0s | `render_page4.js` | Review kritis maskot Arto (3D monokel): bedah detail objek, audit hitungan warna, tabel data komparasi, dan perbandingan harga langganan resmi vs promo. |
| **05** | `page5.html` | 28.0s | `render_page5.js` | Boarding dropship luar angkasa, animasi kolom komentar bergantian (*"Aku pilih Gemini"* ➔ *"Aku pilih Claude"* ➔ *"Mau tes model apa lagi?"*), serta outro studio. |
| **ALL**| `final.html` | 198.0s | `render_final.js` | Penggabungan utuh master 6 part dengan transisi optik *seamless crossfade* + audio sintetis master 44.1 kHz. |

---

## 🛠️ Tutorial Menjalankan & Preview

### 1. Preview Interaktif di Browser (Tanpa Instalasi)
Cukup buka salah satu file HTML langsung di Google Chrome, Microsoft Edge, atau browser modern lainnya:
- Buka `final.html` untuk memutar video penuh 198 detik dengan kontrol navigasi scrubber, slider waktu, dan tombol pintasan chapter.
- Buka `page1.html`, `page2.html`, `pict.html`, `page4.html`, atau `page5.html` untuk menguji per modul tampilan.

### 2. Render Otomatis ke MP4 (Headless Playwright & FFmpeg)
Pastikan telah menginstal [Node.js](https://nodejs.org/) dan [FFmpeg](https://ffmpeg.org/):

```bash
# 1. Install library Playwright
npm install playwright

# 2. Install browser Chromium headless
npx playwright install chromium

# 3. Render video Master Final (Full HD 1080x1920 @ 30 FPS)
node render_final.js
```

Untuk merender per bagian secara individual:
```bash
node render_intro.js   # Render Intro (00)
node render_page1.js   # Render Soal & Prompt (01)
node render_page2.js   # Render Proses & Audit (02)
node render_pict.js    # Render Showdown Roket (03)
node render_page4.js   # Render Arto Review (04)
node render_page5.js   # Render Finale & Outro (05)
```

---

## ⚖️ Lisensi & Hak Cipta

Kode sumber eksperimen dan rendering dilindungi hak cipta © 2026 **Rixsan Joulfiand** · **Joulfiand Studio**.  
Disediakan untuk keperluan edukasi, riset arsitektur AI, dan dokumentasi benchmark komparatif.
