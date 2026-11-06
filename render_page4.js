const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 62.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 1860 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_page4");
const AUDIO_PATH = path.join(__dirname, "audio_page4.wav");
const OUTPUT_MP4 = path.join(__dirname, "page4_verdict.mp4");
const HTML_PATH = "file:///" + path.resolve(__dirname, "page4.html").replace(/\\/g, "/") + "?headless=1";

// ============================================================================
// 1. SINTESIS AUDIO EFEK SUARA HALAMAN 4 (62.00 DETIK · 10 BAB LENGKAP)
// ============================================================================
function generatePage4Audio(wavPath) {
  console.log(`[1/3] Mensintesis audio SFX Halaman 4 sinkron penuh (${DURATION.toFixed(2)} detik)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 314159265;
  const nextRand = () => {
    prng = (1664525 * prng + 1013904223) >>> 0;
    return (prng / 4294967296) * 2.0 - 1.0;
  };

  const addSound = (startSec, durSec, fn) => {
    const i0 = Math.max(0, Math.floor(startSec * sampleRate));
    const i1 = Math.min(numSamples, Math.floor((startSec + durSec) * sampleRate));
    for (let i = i0; i < i1; i++) {
      const lt = (i - i0) / sampleRate;
      samples[i] += fn(lt, durSec);
    }
  };

  const addAirSwoosh = (startSec, durSec, brightness = 1.0, gain = 0.35) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.4);
      const cutoff = (0.02 + Math.sin(p * Math.PI) * 0.14) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      return (lp - hp) * env * gain * 2.5;
    });
  };

  const addScoreChime = (startSec, baseFreq = 880, gain = 0.22) => {
    addSound(startSec, 0.28, (lt) => {
      const env = Math.exp(-lt * 18);
      const f1 = baseFreq;
      const f2 = baseFreq * 1.5;
      const s1 = Math.sin(2 * Math.PI * f1 * lt);
      const s2 = Math.sin(2 * Math.PI * f2 * lt) * 0.45;
      return (s1 + s2) * env * gain;
    });
  };

  const addSubDrop = (startSec, durSec = 0.65, startF = 180, endF = 45, gain = 0.48) => {
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.exp(-lt * 8);
      const freq = startF * Math.exp(-lt * 12) + endF;
      return Math.sin(2 * Math.PI * freq * lt) * env * gain;
    });
  };

  const addOdometerTick = (startSec, gain = 0.16) => {
    addSound(startSec, 0.035, (lt) => {
      const env = Math.exp(-lt * 120);
      const click = Math.sin(2 * Math.PI * 1850 * lt) * 0.6 + nextRand() * 0.4;
      return click * env * gain;
    });
  };

  const addTypewriterClick = (startSec, gain = 0.18) => {
    addSound(startSec, 0.04, (lt) => {
      const env = Math.exp(-lt * 90);
      const mech = Math.sin(2 * Math.PI * 1400 * lt) * 0.5 + nextRand() * 0.5;
      return mech * env * gain;
    });
  };

  const addLaserScanHum = (startSec, durSec = 4.0, gain = 0.20) => {
    addSound(startSec, durSec, (lt, d) => {
      const env = Math.sin((lt / d) * Math.PI);
      const sweep = 440 + Math.sin(lt * 18) * 120;
      const tone = Math.sin(2 * Math.PI * sweep * lt) * 0.7 + Math.sin(2 * Math.PI * (sweep * 2) * lt) * 0.3;
      return tone * env * gain;
    });
  };

  const addIrisShutter = (startSec, gain = 0.35) => {
    addSound(startSec, 0.08, (lt) => {
      const env = Math.exp(-lt * 45);
      const snap = Math.sin(2 * Math.PI * 2200 * lt) * 0.5 + nextRand() * 0.5;
      return snap * env * gain;
    });
  };

  // --------------------------------------------------------------------------
  // TIMELINE EFEK SUARA HALAMAN 4 (PRESISI 100% SINKRON DENGAN 10 BAB)
  // --------------------------------------------------------------------------
  // Ambient Drone Lembut Sepanjang Video
  addSound(0, DURATION, (lt) => {
    const drone = Math.sin(2 * Math.PI * 55 * lt) * 0.04 + Math.sin(2 * Math.PI * 110 * lt) * 0.02;
    return drone;
  });

  // BAB 01 - DETAIL: "Lebih ramai." (0.00s - 6.00s)
  addAirSwoosh(0.10, 0.70, 1.1, 0.35);
  // Callout target clicks
  addScoreChime(0.85, 988, 0.18); // Matahari
  addScoreChime(1.15, 1174, 0.18); // Lengan Menara
  addScoreChime(2.25, 1318, 0.20); // Bulan
  addScoreChime(2.55, 1568, 0.20); // Panel Surya

  // BAB 02 - WARNA: "Hitung warnanya." (6.00s - 12.00s)
  addAirSwoosh(5.90, 0.60, 1.25, 0.38);
  // Gemini Odometer rolling rapid ticks (6.2s - 8.2s)
  for (let t = 6.20; t < 8.20; t += 0.06) {
    addOdometerTick(t, 0.14);
  }
  // Red Alert Chime at 8.25s for +16.442 leak
  addSubDrop(8.25, 0.50, 220, 75, 0.40);
  addScoreChime(8.30, 440, 0.30); // Alert A4

  // Claude Odometer rolling ticks (8.6s - 9.8s)
  for (let t = 8.60; t < 9.80; t += 0.09) {
    addOdometerTick(t, 0.15);
  }
  // Green lock chime at 10.0s for "sesuai batas <= 16"
  addScoreChime(10.00, 1046.5, 0.28); // C6

  // BAB 03 - BEDAH: "Kenapa beda? - Zoom" (12.00s - 18.00s)
  addAirSwoosh(11.90, 0.70, 0.95, 0.40);
  addSubDrop(12.10, 0.60, 160, 50, 0.42);
  addScoreChime(12.50, 880, 0.22); // Target circle lock
  addAirSwoosh(13.20, 0.40, 1.4, 0.25); // Code card 1
  addAirSwoosh(14.20, 0.40, 1.4, 0.25); // Code card 2

  // BAB 04 - X-RAY SCAN: "Magenta Laser" (18.00s - 23.50s)
  addAirSwoosh(17.90, 0.55, 1.5, 0.36);
  addLaserScanHum(18.20, 4.80, 0.24);

  // BAB 05 - SIDE-BY-SIDE: Framebuffer vs Canvas2D (23.50s - 29.00s)
  addAirSwoosh(23.40, 0.60, 1.2, 0.38);
  addSubDrop(23.60, 0.55, 170, 52, 0.40);
  addScoreChime(24.20, 784, 0.20);
  addScoreChime(24.60, 988, 0.20);

  // BAB 06 - DATA: "Kamu yang nilai." (29.00s - 39.00s)
  addAirSwoosh(28.90, 0.65, 1.1, 0.40);
  // Cascade odometer rolling ticks for 7 rows
  const rowTimes = [30.0, 31.2, 32.4, 33.6, 34.8, 36.0, 37.2];
  for (const rt of rowTimes) {
    for (let t = rt; t < rt + 0.45; t += 0.07) {
      addOdometerTick(t, 0.12);
    }
    addScoreChime(rt + 0.48, 880 + Math.random() * 200, 0.16);
  }
  addSubDrop(38.00, 0.60, 180, 45, 0.45); // Final data row impact

  // BAB 07 - HARGA: "Bayar berapa?" (39.00s - 45.00s)
  addAirSwoosh(38.90, 0.60, 1.3, 0.38);
  // Price strike-through sound at 39.8s
  addAirSwoosh(39.80, 0.35, 1.6, 0.30);
  // Cash register / Promo reveal chime at 40.2s
  addScoreChime(40.20, 1318.5, 0.32); // E6
  addScoreChime(40.28, 1567.9, 0.35); // G6
  // Claude price chime at 41.5s
  addScoreChime(41.50, 1046.5, 0.28); // C6

  // BAB 08 - PILIH: "Mana yang worth it buat kamu?" (45.00s - 49.50s)
  addAirSwoosh(44.90, 0.60, 1.0, 0.36);
  // 3 Pills pop in sequentially
  addScoreChime(45.40, 523.25, 0.36); // Pill 1: 1 tes (C5)
  addScoreChime(46.40, 659.25, 0.38); // Pill 2: 1 tugas (E5)
  addScoreChime(47.40, 783.99, 0.42); // Pill 3: one shot (G5)

  // BAB 09 - KODE: "Cek sendiri." (49.50s - 55.50s)
  addAirSwoosh(49.40, 0.55, 1.2, 0.35);
  // Typewriter clicks for github.com/rjoulfiand-afk/NrTO (49.7s - 51.9s)
  for (let t = 49.70; t < 51.90; t += 0.08) {
    addTypewriterClick(t, 0.16);
  }
  // Folder cards pop
  addScoreChime(52.20, 880, 0.22);
  // Iris camera shutter lock for prompt focus box (53.0s)
  addIrisShutter(53.00, 0.42);
  addScoreChime(53.08, 1760, 0.26);

  // BAB 10 - KOMENTAR: "Tulis di komentar." (55.50s - 62.00s)
  addAirSwoosh(55.40, 0.60, 1.3, 0.38);
  addSubDrop(55.60, 0.65, 160, 48, 0.45);
  // Typewriter clicks for "aku pilih Gemini" (55.8s - 57.2s)
  for (let t = 55.80; t < 57.20; t += 0.09) {
    addTypewriterClick(t, 0.15);
  }
  // Backspace click & retype for "aku pilih Claude" (57.8s - 59.2s)
  for (let t = 57.80; t < 59.20; t += 0.09) {
    addTypewriterClick(t, 0.15);
  }
  // Final typing for "mau tes model apa lagi?" (59.7s - 61.2s)
  for (let t = 59.70; t < 61.20; t += 0.09) {
    addTypewriterClick(t, 0.15);
  }

  // Master Fade In & Out
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.08) out *= t / 0.08;
    if (t > DURATION - 0.40) out *= (DURATION - t) / 0.40;
    samples[i] = Math.max(-0.95, Math.min(0.95, out));
  }

  // Format File WAV 16-bit PCM Mono
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
    buffer.writeInt16LE(s, 44 + i * 2);
  }

  fs.writeFileSync(wavPath, buffer);
  console.log(`      Audio SFX Halaman 4 siap di: ${wavPath}`);
}

// ============================================================================
// 2. RENDER 1860 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage4Frames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (Supersampled 2x -> 1080x1920) dengan ${NUM_WORKERS} worker...`);
  
  // Bersihkan folder frames_page4 agar tidak mencampur frame lama
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const framesPerWorker = Math.ceil(TOTAL_FRAMES / NUM_WORKERS);
  const workerTasks = [];
  let completedCount = 0;

  for (let w = 0; w < NUM_WORKERS; w++) {
    const startFrame = w * framesPerWorker;
    const endFrame = Math.min(TOTAL_FRAMES, (w + 1) * framesPerWorker);
    if (startFrame >= endFrame) continue;

    workerTasks.push((async (workerId, fromF, toF) => {
      const context = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();
      page.on("pageerror", (err) => console.error(`[Worker ${workerId}] Page error:`, err));

      await page.goto(HTML_PATH, { waitUntil: "load" });

      for (let frame = fromF; frame < toF; frame++) {
        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        await page.screenshot({ path: frameFile, type: "png" });

        completedCount++;
        if (completedCount % 60 === 0 || completedCount === TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
          console.log(`      Progres render Halaman 4: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      Semua ${TOTAL_FRAMES} frame Halaman 4 berhasil dirender!`);
}

// ============================================================================
// 3. ENCODE KE page4_verdict.mp4 DENGAN FFMPEG (CRF 14 ULTRA-TAJAM)
// ============================================================================
function encodePage4Video() {
  console.log("[3/3] Menggabungkan frame & audio menjadi page4_verdict.mp4 dengan FFmpeg...");
  const ffmpegArgs = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.1",
    "-pix_fmt", "yuv420p",
    "-crf", "14",
    "-preset", "medium",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    OUTPUT_MP4
  ];

  execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  console.log(`\n===============================================================`);
  console.log(`SUKSES! Video Halaman 4 selesai dirender:`);
  console.log(`Path: ${OUTPUT_MP4}`);
  console.log(`Durasi: ${DURATION.toFixed(2)} detik (${TOTAL_FRAMES} frames @ 30 FPS, 1080x1920)`);
  console.log(`===============================================================\n`);
}

// ============================================================================
// ENTRY POINT UTAMA
// ============================================================================
(async () => {
  const startTime = Date.now();
  try {
    generatePage4Audio(AUDIO_PATH);
    await renderPage4Frames();
    encodePage4Video();
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Waktu proses total: ${elapsedSec} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Halaman 4:", err);
    process.exit(1);
  }
})();
