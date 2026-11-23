const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 32.0; // 32.00 Detik Sinkron 100% dengan page2-mascots.html
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 960 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_page2");
const AUDIO_PATH = path.join(__dirname, "audio_page2.wav");
const OUTPUT_MP4 = path.join(__dirname, "page2_process.mp4");

function resolveHtmlPath() {
  const candidates = ["page2-mascots.html", "page2.html"];
  for (const name of candidates) {
    const full = path.resolve(__dirname, name);
    if (fs.existsSync(full)) {
      console.log(`      ✓ Sumber HTML ditemukan: ${name}`);
      return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
    }
  }
  throw new Error("File page2-mascots.html / page2.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. SINTESIS AUDIO PAGE 2 + DUO MASKOT (32.00 DETIK · BERSIH & 0ms DESYNC)
// ============================================================================
function generatePage2Audio(wavPath) {
  console.log(`[1/3] Mensintesis audio SFX Halaman 2 + Merry & Roger (${DURATION.toFixed(2)} detik)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 512024991;
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

  const addAirSwoosh = (startSec, durSec = 0.60, brightness = 0.95, gain = 0.28) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.5);
      const cutoff = (0.022 + Math.sin(p * Math.PI) * 0.11) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      return (lp - hp) * env * gain * 2.1;
    });
  };

  const addPopBlip = (startSec, fStart = 520, fEnd = 780, durSec = 0.14, gain = 0.20) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 26) * (1 - p * 0.3);
      const freq = fStart + (fEnd - fStart) * (1 - Math.exp(-lt * 32));
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2) * env * gain;
    });
  };

  const addFocusTick = (startSec, freq = 620, gain = 0.48) => {
    let lp = 0, hp = 0;
    addSound(startSec, 0.045, (lt) => {
      const w = nextRand();
      lp += 0.28 * (w - lp);
      hp += 0.10 * (lp - hp);
      return ((lp - hp) * Math.exp(-lt * 320) * 0.45 + Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 140) * 0.18) * gain;
    });
  };

  const addSoftSettle = (startSec, toneHz = 180, gain = 0.78) => {
    let lp = 0;
    addSound(startSec, 0.20, (lt) => {
      const w = nextRand();
      lp += 0.12 * (w - lp);
      const softTap = lp * Math.exp(-lt * 95) * 0.34;
      const body = Math.sin(2 * Math.PI * toneHz * Math.exp(-lt * 12) * lt) * Math.exp(-lt * 26) * 0.24;
      return (softTap + body) * gain;
    });
  };

  const addSparkleChime = (startSec, baseFreq = 783.99, gain = 0.14) => {
    addSound(startSec, 0.26, (lt) => {
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 14);
      return (Math.sin(2 * Math.PI * baseFreq * lt) + Math.sin(2 * Math.PI * baseFreq * 1.5 * lt) * 0.28) * env * gain;
    });
  };

  const addTerminalBlip = (startSec, freq = 500, gain = 0.12) => {
    let lp = 0;
    addSound(startSec, 0.05, (lt) => {
      const w = nextRand();
      lp += 0.25 * (w - lp);
      return (lp * Math.exp(-lt * 240) * 0.35 + Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 95) * 0.65) * gain;
    });
  };

  // 1. Masuk Halus: Panel + Merry & Roger Mendarat (0.15s - 1.15s)
  addAirSwoosh(0.15, 0.65, 0.92, 0.26);
  addSoftSettle(0.85, 290, 0.55); // Merry
  addSoftSettle(1.00, 190, 0.55); // Roger

  // 2. Beat 1 — MERRY Jelaskan Canvas 2D + Bayer 4x4 (1.35s - 6.35s)
  addAirSwoosh(1.35, 0.45, 1.15, 0.22);
  addPopBlip(1.50, 520, 780, 0.14, 0.19);
  [1.50, 2.35, 3.30, 4.30, 5.20].forEach((t, i) => addTerminalBlip(t, 520 + i * 36, 0.11));
  addFocusTick(1.85, 640, 0.42); // Iris lock X-Ray Gemini

  // 3. Beat 2 — ROGER Jelaskan Uint8Array FB + 6 Modul (6.40s - 11.40s)
  addAirSwoosh(6.40, 0.45, 0.92, 0.22);
  addPopBlip(6.55, 410, 620, 0.14, 0.20);
  [6.45, 7.30, 8.25, 9.20, 10.10].forEach((t, i) => addTerminalBlip(t, 440 + i * 32, 0.11));
  addFocusTick(6.85, 580, 0.42); // Iris lock X-Ray Claude

  // 4. Cross-Dissolve ke Mode B (Fitur Asli & Audit 16 Warna) + Beat 3 MERRY (11.15s - 16.65s)
  addAirSwoosh(11.15, 0.65, 1.10, 0.26);
  addPopBlip(11.65, 560, 860, 0.14, 0.20);
  addFocusTick(11.95, 650, 0.44); // Iris: STAGE SEPARATION
  addFocusTick(14.35, 710, 0.44); // Iris: SATURN-IV + TARGET

  // 5. Beat 4 — ROGER Balas Gravity Turn 90° + Bumi 3D Lampu Kota (16.70s - 21.85s)
  addAirSwoosh(16.70, 0.45, 0.95, 0.22);
  addPopBlip(16.85, 430, 680, 0.14, 0.20);
  addFocusTick(17.15, 600, 0.44); // Iris: GRAVITY TURN 90°
  addFocusTick(19.55, 660, 0.44); // Iris: BUMI 3D + CITY LIGHTS

  // 6. Beat 5 — DUET AUDIT 16 WARNA LOLOS (21.95s - 25.95s)
  addAirSwoosh(21.95, 0.55, 1.05, 0.26);
  addSparkleChime(22.15, 523.25, 0.13);
  addSparkleChime(22.24, 659.25, 0.13);
  addSparkleChime(22.33, 783.99, 0.14);

  // 7. Beat 6 — Morph Panel ke Page 3 + "LETSGO!!" -> Clean Launch Frame (26.15s - 32.00s)
  addAirSwoosh(26.15, 0.80, 1.00, 0.30);
  addSoftSettle(27.55, 138, 0.90);
  addSparkleChime(27.60, 659.25, 0.15);
  addSparkleChime(27.70, 987.77, 0.16);
  addAirSwoosh(30.35, 0.78, 0.84, 0.22);

  // Soft-knee Limiter + Master Fade In/Out
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.08) out *= t / 0.08;
    if (t > DURATION - 0.45) out *= (DURATION - t) / 0.45;
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
  console.log(`      ✓ Audio Page 2 (Mascots) siap: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, peak ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. RENDER 960 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage2Frames(htmlPath) {
  const forceRender = process.argv.includes("--force-frames");
  const lastFramePath = path.join(FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);

  if (!forceRender && fs.existsSync(lastFramePath)) {
    const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png"));
    if (files.length >= TOTAL_FRAMES) {
      console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_page2/ sudah lengkap! (Pakai --force-frames untuk render ulang)`);
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
          console.log(`      Progres render Page 2: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Page 2 selesai dirender!`);
}

// ============================================================================
// 3. ENCODE KE page2_process.mp4 DENGAN FFMPEG (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodePage2Video() {
  console.log("[3/3] Menggabungkan 960 frame & audio menjadi page2_process.mp4 dengan FFmpeg...");
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
  console.log(`\nSUKSES! Video Page 2 selesai di: ${OUTPUT_MP4}`);
}

(async () => {
  const startTime = Date.now();
  try {
    generatePage2Audio(AUDIO_PATH);
    if (!process.argv.includes("--audio-only")) {
      const htmlPath = resolveHtmlPath();
      await renderPage2Frames(htmlPath);
      encodePage2Video();
    }
    console.log(`Total waktu proses: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Page 2:", err);
    process.exit(1);
  }
})();