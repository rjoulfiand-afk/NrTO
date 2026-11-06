const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 16.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 480 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_page4");
const AUDIO_PATH = path.join(__dirname, "audio_page4.wav");
const OUTPUT_MP4 = path.join(__dirname, "page4_verdict.mp4");
const HTML_PATH = "file:///" + path.resolve(__dirname, "page4.html").replace(/\\/g, "/") + "?headless=1";

// ============================================================================
// 1. SINTESIS AUDIO EFEK SUARA HALAMAN 4 (16.00 DETIK)
// ============================================================================
function generatePage4Audio(wavPath) {
  console.log("[1/3] Mensintesis audio SFX Halaman 4 sinkron penuh (16.00 detik)...");
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

  const addAirSwoosh = (startSec, durSec, brightness = 1.0, gain = 0.40) => {
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

  const addCuteBubblePop = (startSec, baseFreq = 440, gain = 0.50) => {
    addSound(startSec, 0.14, (lt) => {
      const p = lt / 0.14;
      const env = Math.sin(Math.pow(p, 0.4) * Math.PI) * Math.exp(-lt * 32);
      const f = baseFreq * (1 + 1.8 * Math.sin(p * Math.PI * 0.8));
      return Math.sin(2 * Math.PI * f * lt) * env * gain;
    });
  };

  const addCuteDotClick = (startSec, freq = 1200, gain = 0.26) => {
    let lp = 0;
    addSound(startSec, 0.045, (lt) => {
      const env = Math.exp(-lt * 85);
      lp += 0.4 * (nextRand() - lp);
      const tone = Math.sin(2 * Math.PI * freq * lt);
      return (tone * 0.75 + lp * 0.25) * env * gain;
    });
  };

  const addSparkleTwinkle = (startSec, freq = 1760, gain = 0.22) => {
    addSound(startSec, 0.35, (lt) => {
      const env = Math.exp(-lt * 14);
      const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 18 * lt);
      const tone = Math.sin(2 * Math.PI * freq * vibrato * lt) +
                   Math.sin(2 * Math.PI * freq * 2.0 * lt) * 0.35;
      return tone * env * gain;
    });
  };

  // --------------------------------------------------------------------------
  // TIMELINE EFEK SUARA HALAMAN 4 (PRESISI 100% SINKRON DENGAN 3 FASE & OUTRO)
  // --------------------------------------------------------------------------
  // Fase 1: Sampel 1 · Landasan & Hitung Mundur (0.00s - 3.60s)
  addAirSwoosh(0.10, 0.70, 1.1, 0.45);
  // Bar pengisian metrik & laser scan
  for (let t = 0.80; t < 1.60; t += 0.16) {
    addCuteDotClick(t, 850 + Math.random() * 150, 0.14);
  }
  addScoreChime(1.70, 784, 0.22); // G5 score ping Gemini
  addScoreChime(1.90, 988, 0.24); // B5 score ping Claude

  // Fase 2: Sampel 2 · Lepas Landas & Fisika Staging (3.60s - 7.20s)
  addAirSwoosh(3.60, 0.60, 1.25, 0.44);
  // Low rocket thrust vibration & screen rumble
  addSound(3.70, 2.00, (lt, d) => {
    const p = lt / d;
    const env = Math.sin(p * Math.PI) * 0.22;
    const rumble = Math.sin(2 * Math.PI * (52 + 18 * Math.sin(lt * 9)) * lt);
    return rumble * env;
  });
  for (let t = 4.40; t < 5.20; t += 0.16) {
    addCuteDotClick(t, 900 + Math.random() * 150, 0.14);
  }
  addScoreChime(5.30, 880, 0.24); // A5 score ping Gemini
  addScoreChime(5.50, 1046, 0.22); // C6 score ping Claude

  // Fase 3: Sampel 3 · Orbit & Planet 3D (7.20s - 10.80s)
  addAirSwoosh(7.20, 0.70, 0.95, 0.42);
  addSparkleTwinkle(7.90, 1318.5, 0.18); // E6 cosmic ambient
  for (let t = 8.10; t < 8.90; t += 0.16) {
    addCuteDotClick(t, 950 + Math.random() * 150, 0.14);
  }
  addScoreChime(9.00, 880, 0.22); // A5 score ping Gemini
  addScoreChime(9.20, 1174.6, 0.25); // D6 score ping Claude

  // Fase 4: Total Scorecard & Matriks Akhir (10.80s - 13.50s)
  addSubDrop(10.80, 0.75, 170, 48, 0.52); // Sub-drop impact for Scorecard
  addAirSwoosh(10.85, 0.55, 1.35, 0.40);
  // Rapid tally count ticks as total scores rise (29.1 vs 29.3)
  for (let t = 11.10; t < 12.00; t += 0.08) {
    addCuteDotClick(t, 900 + Math.random() * 200, 0.15);
  }
  // Harmonious Golden Chords at 12.40s for "HAMPIR IMBANG SEMPURNA"
  addScoreChime(12.40, 659.25, 0.22); // E5
  addScoreChime(12.48, 830.61, 0.24); // G#5
  addScoreChime(12.56, 987.77, 0.26); // B5

  // Fase 5: Outro Viral & Live Community Poll (13.50s - 16.00s)
  addSubDrop(13.50, 0.45, 140, 55, 0.40); // Impact masuk
  addAirSwoosh(13.55, 0.50, 1.25, 0.36);
  // Heroic Golden Sting for "GIMANA?" (13.70s)
  addScoreChime(13.70, 523.25, 0.35); // C5
  addScoreChime(13.75, 783.99, 0.38); // G5
  addScoreChime(13.80, 1046.5, 0.40); // C6

  // Cute Bubble Pop for comment bubble appearance (13.85s)
  addCuteBubblePop(13.85, 460, 0.52);

  // Cute bouncing wave dots (● ● ●)
  addCuteDotClick(14.05, 1046.5, 0.26); // Dot 1
  addCuteDotClick(14.20, 1318.5, 0.27); // Dot 2
  addCuteDotClick(14.35, 1567.9, 0.29); // Dot 3

  // Floating reaction sparkles & heart flutter (14.50s - 15.60s)
  addSparkleTwinkle(14.55, 1760.0, 0.24);
  addSparkleTwinkle(14.85, 2093.0, 0.20);
  addSparkleTwinkle(15.20, 2349.3, 0.18);

  // Call to action button chime
  addCuteBubblePop(14.70, 587.33, 0.38);

  // Limiter & Master Fade
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.05) out *= t / 0.05;
    if (t > DURATION - 0.25) out *= (DURATION - t) / 0.25;
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
// 2. RENDER 480 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage4Frames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (Supersampled 2x -> 1080x1920) dengan ${NUM_WORKERS} worker...`);
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }

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
        if (completedCount % 48 === 0 || completedCount === TOTAL_FRAMES) {
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
// 3. ENCODE KE page4_verdict.mp4 DENGAN FFMPEG (CRF 12 ULTRA-TAJAM)
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
  console.log(`\n===============================================================`);
  console.log(`SUKSES! Video Halaman 4 selesai dirender:`);
  console.log(`Path: ${OUTPUT_MP4}`);
  console.log(`Durasi: 16.00 detik (${TOTAL_FRAMES} frames @ 30 FPS, 1080x1920)`);
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
