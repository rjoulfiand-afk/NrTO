const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 26.0; // 26.00 Detik Sinkron 100% dengan page1.html
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 780 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 2; // Optimal untuk dual-core Celeron N4500

const FRAMES_DIR = path.join(__dirname, "frames_page1");
const AUDIO_PATH = path.join(__dirname, "audio_page1.wav");
const OUTPUT_MP4 = path.join(__dirname, "page1_prompt.mp4");

function resolveHtmlPath() {
  const full = path.resolve(__dirname, "page1.html");
  if (fs.existsSync(full)) {
    console.log(`      ✓ Sumber HTML ditemukan: page1.html`);
    return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
  }
  throw new Error("File page1.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. SINTESIS AUDIO PAGE 1 (26.00 DETIK · TENANG, BERSIH & 0ms DESYNC)
// ============================================================================
function generatePage1Audio(wavPath) {
  console.log(`[1/3] Mensintesis audio SFX Halaman 1 (${DURATION.toFixed(2)} detik, tenang & sinkron)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 135792468;
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

  const addAirSwoosh = (startSec, durSec = 0.65, brightness = 0.95, gain = 0.28) => {
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

  const addFocusTick = (startSec, freq = 620, gain = 0.50) => {
    let lp = 0, hp = 0;
    addSound(startSec, 0.045, (lt) => {
      const w = nextRand();
      lp += 0.28 * (w - lp);
      hp += 0.10 * (lp - hp);
      const tickNoise = (lp - hp) * Math.exp(-lt * 320) * 0.45;
      const focusPulse = Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 140) * 0.18;
      return (tickNoise + focusPulse) * gain;
    });
  };

  const addSoftCardSettle = (startSec, toneHz = 185, gain = 0.80) => {
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
    addSound(startSec, 0.28, (lt) => {
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 14);
      return (Math.sin(2 * Math.PI * baseFreq * lt) + Math.sin(2 * Math.PI * baseFreq * 1.5 * lt) * 0.28) * env * gain;
    });
  };

  // 1. Masuk Halus (0.10s - 1.10s)
  addAirSwoosh(0.10, 0.65, 0.95, 0.26);
  addAirSwoosh(0.48, 0.60, 0.85, 0.24);

  // 2. Ketikan Mekanikal Akustik Tenang & Lembut (1.20s - 10.35s)
  let kTime = 1.20;
  const keyIntervals = [0.038, 0.044, 0.052, 0.065, 0.035, 0.042, 0.058];
  let kIdx = 0;
  while (kTime < 10.35) {
    const freq = 1200 + Math.sin(kTime * 7.0) * 350;
    addSound(kTime, 0.024, (lt) => {
      const w = nextRand();
      const click = w * Math.exp(-lt * 450) * 0.24;
      const tone = Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 280) * 0.12;
      return (click + tone) * 0.42;
    });
    kTime += keyIntervals[kIdx % keyIntervals.length];
    kIdx++;
  }

  // 3. Scroll Tenang Balik ke Atas (10.40s - 11.35s)
  addAirSwoosh(10.40, 0.85, 0.65, 0.20);

  // 4. Lima Poin Kunci Iris Scanner Kaca Kuning (11.50s, 12.85s, 14.20s, 15.55s, 16.90s)
  const lockTimes = [11.50, 12.85, 14.20, 15.55, 16.90];
  const lockPitches = [523.25, 659.25, 783.99, 880.0, 1046.5];
  lockTimes.forEach((t, i) => {
    addFocusTick(t, lockPitches[i], 0.46);
    addSparkleChime(t + 0.03, lockPitches[i] * 1.5, 0.12);
  });

  // 5. Lipat Super Mulus ke Bar Input Bawah (19.00s - 20.15s)
  addAirSwoosh(19.00, 1.05, 0.82, 0.28);

  // 6. Klik Mouse pada Tombol Kirim [↑] (21.25s) + Kapsul prompt.txt meluncur
  addSound(21.25, 0.040, (lt) => {
    const w = nextRand();
    const down = Math.exp(-lt * 480) * 0.85;
    const up = lt > 0.018 ? Math.exp(-(lt - 0.018) * 550) * 0.45 : 0;
    return w * (down + up) * 0.58;
  });
  addAirSwoosh(21.30, 0.52, 1.20, 0.30);

  // 7. Pendaratan Halus 2 Kartu AI (21.85s Gemini Carbon, 21.98s Claude Opus 5.5)
  addSoftCardSettle(21.85, 180, 0.82);
  addSoftCardSettle(21.98, 215, 0.82);

  // 8. Stempel Emas "1× KIRIM · 0 REVISI" (23.25s)
  addSoftCardSettle(23.25, 145, 0.90);
  addAirSwoosh(23.22, 0.34, 0.90, 0.24);
  addSparkleChime(23.32, 880.0, 0.14);

  // 9. Smooth Exit Sweep (25.05s)
  addAirSwoosh(25.05, 0.80, 0.78, 0.22);

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
  console.log(`      ✓ Audio Page 1 siap: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, peak ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. RENDER 780 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage1Frames(htmlPath) {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame dari page1.html (SSAA 2x -> 1080x1920 @ ${FPS} FPS) dengan ${NUM_WORKERS} worker...`);
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
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
      await page.waitForTimeout(200);

      for (let frame = fromF; frame < toF; frame++) {
        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        await page.screenshot({ path: frameFile, type: "png", timeout: 0, animations: "disabled" });

        completedCount++;
        if (completedCount % 50 === 0 || completedCount === TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
          console.log(`      Progres render Page 1: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Page 1 selesai dirender!`);
}

// ============================================================================
// 3. ENCODE KE page1_prompt.mp4 DENGAN FFMPEG
// ============================================================================
function encodePage1Video() {
  console.log("[3/3] Menggabungkan 780 frame & audio menjadi page1_prompt.mp4 dengan FFmpeg...");
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
    "-preset", "faster",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    OUTPUT_MP4
  ];

  execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  console.log(`\nSUKSES! Video Page 1 selesai di: ${OUTPUT_MP4}`);
}

(async () => {
  const startTime = Date.now();
  try {
    generatePage1Audio(AUDIO_PATH);
    const htmlPath = resolveHtmlPath();
    await renderPage1Frames(htmlPath);
    encodePage1Video();
    console.log(`Total waktu render Page 1: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Page 1:", err);
    process.exit(1);
  }
})();
