const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 54.0; // 54.00 Detik Sinkron 100% dengan page4-final.html
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 1620 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_page4");
const AUDIO_PATH = path.join(__dirname, "audio_page4.wav");
const OUTPUT_MP4 = path.join(__dirname, "page4_verdict.mp4");

function resolveHtmlPath() {
  const candidates = ["page4-final.html", "page4-v4.html", "page4.html"];
  for (const name of candidates) {
    const full = path.resolve(__dirname, name);
    if (fs.existsSync(full)) {
      console.log(`      ✓ Sumber HTML ditemukan: ${name}`);
      return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
    }
  }
  throw new Error("File page4-final.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. SINTESIS AUDIO PAGE 4 FINAL (54.00 DETIK · 0ms DESYNC DI SEMUA ADEGAN)
//    Zero drone latar · Deterministik PRNG · Soft-knee limiter (0% clipping)
// ============================================================================
function generatePage4Audio(wavPath) {
  console.log(`[1/3] Mensintesis audio SFX Halaman 4 Final (${DURATION.toFixed(2)} detik)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 884219037;
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

  const addAirSwoosh = (startSec, durSec = 0.60, brightness = 1.0, gain = 0.30) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.5);
      const cutoff = (0.022 + Math.sin(p * Math.PI) * 0.12) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      return (lp - hp) * env * gain * 2.1;
    });
  };

  const addPortalOpen = (startSec, durSec = 0.72, gain = 0.28) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p * 0.4, 0.6);
      const freq = 140 + p * 320 + Math.sin(lt * 24) * 18;
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.65 + Math.sin(phase * 1.5) * 0.35) * env * gain;
    });
  };

  const addFallWhistle = (startSec, durSec = 0.68, gain = 0.20) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.05) * (1 - Math.pow(p, 3));
      const freq = 920 * Math.pow(0.28, p * p);
      phase += (2 * Math.PI * freq) / sampleRate;
      return Math.sin(phase) * env * gain;
    });
  };

  const addFaceplantSplat = (startSec, gain = 0.66) => {
    let phase = 0, lp = 0;
    addSound(startSec, 0.42, (lt) => {
      const freq = 52 + 185 * Math.exp(-lt * 32);
      phase += (2 * Math.PI * freq) / sampleRate;
      const subBody = Math.sin(phase) * Math.exp(-lt * 11.5) * 0.85;
      const w = nextRand();
      lp += 0.32 * (w - lp);
      const slap = lp * Math.exp(-lt * 95) * 0.52;
      return (subBody + slap) * gain;
    });
  };

  const addPopBlip = (startSec, fStart = 420, fEnd = 740, durSec = 0.14, gain = 0.22) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 25) * (1 - p * 0.3);
      const freq = fStart + (fEnd - fStart) * (1 - Math.exp(-lt * 32));
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2) * env * gain;
    });
  };

  // Crisp UI Tap (klik bar pilihan cepat -> langsung input!)
  const addQuickTap = (startSec, freq = 640, gain = 0.26) => {
    let lp = 0;
    addSound(startSec, 0.09, (lt) => {
      const w = nextRand();
      lp += 0.28 * (w - lp);
      const click = lp * Math.exp(-lt * 260) * 0.45;
      const pop   = Math.sin(2 * Math.PI * (freq + lt * 1400) * lt) * Math.exp(-lt * 55) * 0.55;
      return (click + pop) * gain;
    });
  };

  const addSparkleChime = (startSec, baseFreq = 880.0, durSec = 0.28, gain = 0.16) => {
    addSound(startSec, durSec, (lt) => {
      const env = Math.min(1, lt / 0.005) * Math.exp(-lt * 14);
      return (Math.sin(2 * Math.PI * baseFreq * lt) + Math.sin(2 * Math.PI * baseFreq * 1.5 * lt) * 0.30) * env * gain;
    });
  };

  const addFocusTick = (startSec, freq = 620, gain = 0.44) => {
    let lp = 0, hp = 0;
    addSound(startSec, 0.045, (lt) => {
      const w = nextRand();
      lp += 0.28 * (w - lp);
      hp += 0.10 * (lp - hp);
      return ((lp - hp) * Math.exp(-lt * 320) * 0.45 + Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 140) * 0.18) * gain;
    });
  };

  const addSoftSettle = (startSec, toneHz = 180, gain = 0.72) => {
    let lp = 0;
    addSound(startSec, 0.20, (lt) => {
      const w = nextRand();
      lp += 0.12 * (w - lp);
      return (lp * Math.exp(-lt * 95) * 0.34 + Math.sin(2 * Math.PI * toneHz * Math.exp(-lt * 12) * lt) * Math.exp(-lt * 26) * 0.24) * gain;
    });
  };

  const addGoldenChord = (startSec, durSec = 2.00, gain = 0.20) => {
    addSound(startSec, durSec, (lt, d) => {
      const env = Math.min(1, lt / 0.08) * Math.exp(-lt * 1.9) * Math.min(1, (d - lt) / 0.35);
      return (
        Math.sin(2 * Math.PI * 110.00 * lt) * 0.42 +
        Math.sin(2 * Math.PI * 220.00 * lt) * 0.32 +
        Math.sin(2 * Math.PI * 277.18 * lt) * 0.22 +
        Math.sin(2 * Math.PI * 329.63 * lt) * 0.26 +
        Math.sin(2 * Math.PI * 440.00 * lt) * 0.16
      ) * env * gain;
    });
  };

  // BAB 1 (0.00s - 15.50s): LUBANG -> JATUH TENGKURAP -> PUSH-UP -> TENGIL INTRO
  addPortalOpen(0.40, 0.72, 0.28);
  addAirSwoosh(0.44, 0.55, 1.15, 0.22);
  addFallWhistle(1.25, 0.68, 0.20);
  addFaceplantSplat(1.95, 0.66);
  addPopBlip(2.28, 320, 190, 0.14, 0.22);
  addAirSwoosh(2.40, 0.45, 0.80, 0.22);
  addSparkleChime(2.55, 740, 0.24, 0.11);
  addAirSwoosh(3.15, 0.65, 0.75, 0.20);
  addPopBlip(4.12, 440, 320, 0.16, 0.20);
  addPopBlip(6.52, 580, 920, 0.15, 0.26);
  addAirSwoosh(6.75, 0.42, 1.25, 0.26);
  addSoftSettle(7.36, 175, 0.72);
  addSparkleChime(7.40, 1046.5, 0.30, 0.16);
  addSparkleChime(9.28, 1174.7, 0.28, 0.16);
  addFocusTick(11.46, 660, 0.38);

  // BAB 2 (15.50s - 25.50s): KOREKSI 01 — GEMINI CARBON · HIGH
  addAirSwoosh(15.42, 0.65, 1.12, 0.32);
  addFocusTick(15.90, 620, 0.42);
  addFocusTick(17.70, 680, 0.42);
  addSparkleChime(18.60, 783.99, 0.24, 0.13);
  addFocusTick(20.60, 540, 0.44);

  // BAB 3 (25.50s - 35.50s): KOREKSI 02 — CLAUDE OPUS 5.5 · EXTRA
  addAirSwoosh(25.42, 0.65, 0.95, 0.32);
  addFocusTick(25.90, 600, 0.42);
  addFocusTick(27.70, 660, 0.42);
  addSparkleChime(28.60, 880.00, 0.24, 0.13);
  addFocusTick(30.60, 520, 0.44);

  // BAB 4 (35.50s - 41.50s): RAPOR HEAD-TO-HEAD OBJEKTIF
  addAirSwoosh(35.42, 0.65, 1.05, 0.32);
  [35.75, 36.00, 36.25, 36.50, 36.75].forEach((rt, idx) => addFocusTick(rt, 560 + idx * 36, 0.36));
  addSparkleChime(36.82, 880.0, 0.28, 0.15);

  // BAB 5A (41.50s - 44.85s): UNIFIED BOX ("Skor tipis 9.2 vs 9.3" + 2 Kotak)
  addAirSwoosh(41.42, 0.62, 1.00, 0.30);
  addSoftSettle(41.68, 175, 0.72);        // "Skor tipis" muncul
  addSoftSettle(42.45, 220, 0.65);        // Sub-kotak Gemini masuk
  addSoftSettle(42.65, 195, 0.65);        // Sub-kotak Claude masuk

  // BAB 5B (44.20s - 54.00s): KOTAK SKOR HILANG -> GELEMBUNG ARTO -> SOLO IG SHEET!
  addAirSwoosh(44.22, 0.58, 1.10, 0.28);  // Swap mulus: Unified Box keluar -> Solo IG Sheet masuk!
  addPopBlip(44.48, 460, 860, 0.16, 0.24); // Gelembung Arto ("Tulis pilihanmu...") pop!

  // QUICK-PICK 1: Tap Bar "aku pilih gemini" (46.05s) -> Instant Input (46.20s) -> Send (47.05s) -> Feed (47.32s)
  addQuickTap(46.06, 680, 0.28);
  addPopBlip(46.20, 420, 740, 0.12, 0.20); // Teks langsung terinput!
  addPopBlip(47.06, 580, 960, 0.14, 0.24); // Tombol Send [↑] ditekan!
  addSparkleChime(47.32, 783.99, 0.24, 0.15); // Komentar 1 masuk feed!

  // QUICK-PICK 2: Tap Bar "kalau aku sih claude" (48.45s) -> Instant Input (48.60s) -> Send (49.45s) -> Feed (49.72s)
  addQuickTap(48.46, 600, 0.28);
  addPopBlip(48.60, 400, 700, 0.12, 0.20); // Teks langsung terinput!
  addPopBlip(49.46, 600, 1020, 0.14, 0.25); // Tombol Send [↑] ditekan!
  addSparkleChime(49.72, 987.77, 0.26, 0.16); // Komentar 2 masuk feed!
  addGoldenChord(49.75, 2.00, 0.20);       // Warm Golden Chord penegas!
  addSparkleChime(50.18, 1174.7, 0.26, 0.15); // Monocle Wink Glint Arto!

  // Smooth handover swoosh menuju Page 5!
  addAirSwoosh(53.30, 0.65, 0.85, 0.24);

  // Soft-knee Limiter + Master Fade In/Out
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.08) out *= t / 0.08;
    if (t > DURATION - 0.50) out *= (DURATION - t) / 0.50;
    out = Math.tanh(out * 1.02) * 0.92;
    samples[i] = out;
    if (Math.abs(out) > peak) peak = Math.abs(out);
  }

  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
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
  console.log(`      ✓ Audio Page 4 Final siap: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, peak ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. RENDER 1620 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage4Frames(htmlPath) {
  const forceRender = process.argv.includes("--force-frames");
  const lastFramePath = path.join(FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);

  if (!forceRender && fs.existsSync(lastFramePath)) {
    const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png"));
    if (files.length >= TOTAL_FRAMES) {
      console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_page4/ sudah lengkap! (Pakai --force-frames untuk render ulang)`);
      return;
    }
  }

  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (SSAA 2x -> 1080x1920 @ ${FPS} FPS) dengan ${NUM_WORKERS} worker...`);
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

      await page.goto(htmlPath, { waitUntil: "load" });

      for (let frame = fromF; frame < toF; frame++) {
        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        await page.screenshot({ path: frameFile, type: "png" });

        completedCount++;
        if (completedCount % 60 === 0 || completedCount === TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
          console.log(`      Progres render Page 4: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Page 4 selesai dirender!`);
}

// ============================================================================
// 3. ENCODE KE page4_verdict.mp4 DENGAN FFMPEG (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodePage4Video() {
  console.log("[3/3] Menggabungkan 1620 frame & audio menjadi page4_verdict.mp4 dengan FFmpeg...");
  const ffmpegArgs = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.1",
    "-pix_fmt", "yuv420p",
    "-crf", "12",
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
  console.log(`\nSUKSES! Video Page 4 Final selesai di: ${OUTPUT_MP4}`);
}

(async () => {
  const startTime = Date.now();
  try {
    generatePage4Audio(AUDIO_PATH);
    if (!process.argv.includes("--audio-only")) {
      const htmlPath = resolveHtmlPath();
      await renderPage4Frames(htmlPath);
      encodePage4Video();
    }
    console.log(`Total waktu proses: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Page 4 Final:", err);
    process.exit(1);
  }
})();