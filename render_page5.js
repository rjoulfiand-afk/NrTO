const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 28.0; // 28.00 Detik Sinkron 100% dengan page5.html
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 840 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_page5");
const AUDIO_PATH = path.join(__dirname, "audio_page5.wav");
const OUTPUT_MP4 = path.join(__dirname, "page5_outro.mp4");

function resolveHtmlPath() {
  const candidates = ["page5-v2.html", "page5.html"];
  for (const name of candidates) {
    const full = path.resolve(__dirname, name);
    if (fs.existsSync(full)) {
      console.log(`      ✓ Sumber HTML ditemukan: ${name}`);
      return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
    }
  }
  throw new Error("File page5.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. SINTESIS AUDIO PAGE 5 FINALE (28.00 DETIK · FOLLOW + BOW + ROCKET + JUMPS)
//    Zero drone latar · Deterministik PRNG · Soft-knee limiter (0% clipping)
// ============================================================================
function generatePage5Audio(wavPath) {
  console.log(`[1/3] Mensintesis audio SFX Halaman 5 Finale (${DURATION.toFixed(2)} detik)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 202611239;
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

  const addPopBlip = (startSec, fStart = 420, fEnd = 740, durSec = 0.14, gain = 0.24) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 25) * (1 - p * 0.3);
      const freq = fStart + (fEnd - fStart) * (1 - Math.exp(-lt * 32));
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2) * env * gain;
    });
  };

  // Comic Boing / Jump Arc Upward! (untuk Merry, Roger, & Arto melompat masuk roket!)
  const addComicJumpBoing = (startSec, fLow = 240, fHigh = 860, durSec = 0.48, gain = 0.24) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.012) * Math.pow(1 - p, 1.3);
      const freq = fLow + (fHigh - fLow) * Math.pow(p, 0.72) + Math.sin(lt * 46) * 26 * (1 - p);
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.78 + Math.sin(phase * 2) * 0.22) * env * gain;
    });
  };

  // Rocket Hover Descent & Mega Blast-Off Thruster Rumble!
  const addRocketThrust = (startSec, durSec, intensityStart, intensityEnd, gain = 0.36) => {
    let lp1 = 0, lp2 = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.15) * Math.min(1, (d - lt) / 0.25);
      const inten = intensityStart + (intensityEnd - intensityStart) * p;
      const w = nextRand();
      lp1 += (0.018 + inten * 0.045) * (w - lp1);
      lp2 += 0.008 * (lp1 - lp2);
      const rumble = Math.sin(2 * Math.PI * (44 + inten * 18) * lt) * 0.35;
      return (lp1 * 1.8 + lp2 * 1.4 + rumble) * inten * env * gain;
    });
  };

  // Mechanical Hatch Slide (palka roket buka / tutup!)
  const addHatchSlide = (startSec, open = true, gain = 0.26) => {
    let lp = 0, hp = 0, phase = 0;
    addSound(startSec, 0.42, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI);
      const w = nextRand();
      lp += 0.14 * (w - lp);
      hp += 0.04 * (lp - hp);
      const f = open ? (260 + p * 220) : (480 - p * 220);
      phase += (2 * Math.PI * f) / sampleRate;
      return ((lp - hp) * 0.8 + Math.sin(phase) * 0.25) * env * gain;
    });
  };

  const addSparkleChime = (startSec, baseFreq = 880.0, durSec = 0.28, gain = 0.16) => {
    addSound(startSec, durSec, (lt) => {
      const env = Math.min(1, lt / 0.005) * Math.exp(-lt * 14);
      return (Math.sin(2 * Math.PI * baseFreq * lt) + Math.sin(2 * Math.PI * baseFreq * 1.5 * lt) * 0.30) * env * gain;
    });
  };

  const addWarmChord = (startSec, durSec = 2.10, gain = 0.22) => {
    addSound(startSec, durSec, (lt, d) => {
      const env = Math.min(1, lt / 0.10) * Math.exp(-lt * 1.6) * Math.min(1, (d - lt) / 0.40);
      return (
        Math.sin(2 * Math.PI * 130.81 * lt) * 0.40 +
        Math.sin(2 * Math.PI * 261.63 * lt) * 0.32 +
        Math.sin(2 * Math.PI * 329.63 * lt) * 0.24 +
        Math.sin(2 * Math.PI * 392.00 * lt) * 0.22 +
        Math.sin(2 * Math.PI * 523.25 * lt) * 0.15
      ) * env * gain;
    });
  };

  // 1. Entrance IG Card + Trio (0.15s)
  addAirSwoosh(0.15, 0.65, 1.05, 0.26);

  // 2. Auto-Klik Tombol Follow -> Following ✓! (4.45s - 4.75s)
  addPopBlip(4.45, 520, 960, 0.14, 0.28);
  addSparkleChime(4.62, 783.99, 0.26, 0.16);
  addSparkleChime(4.74, 1046.5, 0.28, 0.16);

  // 3. Highlight Link GitHub di Bio (6.75s)
  addAirSwoosh(6.65, 0.45, 1.12, 0.20);
  addSparkleChime(6.85, 880.00, 0.24, 0.14);

  // 4. "Terimakasih!" + Trio Membungkuk Sopan (9.70s)
  addWarmChord(9.75, 2.00, 0.22);

  // 5. PLOT TWIST! IG Card pergi -> Roket Boss Jull turun -> Palka terbuka -> BOSS TERIAK!
  addAirSwoosh(12.18, 0.60, 0.85, 0.24);
  addRocketThrust(12.60, 1.65, 0.45, 0.90, 0.34); // Roket turun!
  addHatchSlide(13.80, true, 0.28);               // Palka roket terbuka!
  addPopBlip(14.20, 320, 680, 0.18, 0.28);        // Emote [!] Trio kaget diteriaki Boss!
  addAirSwoosh(14.22, 0.40, 1.35, 0.22);

  // 6. Trio Kinetic Boarding + Airlock Warp Absorption + Crew LED Lock!
  // Merry (Gemini): Launch 16.90s -> Airlock Dive Burst 17.92s
  addComicJumpBoing(16.88, 340, 980, 0.46, 0.25);
  addAirSwoosh(17.02, 0.68, 1.30, 0.22);
  addPopBlip(17.92, 380, 880, 0.16, 0.25);        // Portal absorption pop!
  addSparkleChime(17.96, 783.99, 0.26, 0.16);     // Crew LED #1 Blue Lock!

  // Roger (Claude): Launch 19.26s -> Airlock Dive Burst 20.28s
  addComicJumpBoing(19.24, 250, 820, 0.48, 0.25);
  addAirSwoosh(19.38, 0.68, 1.10, 0.22);
  addPopBlip(20.28, 340, 780, 0.16, 0.25);        // Portal absorption pop!
  addSparkleChime(20.32, 880.00, 0.26, 0.16);     // Crew LED #2 Coral Lock!

  // Arto (Penilai): Launch 21.66s -> Slow-Mo Hang Sparkle 22.18s -> Golden Zip 23.02s -> Airlock Burst 23.54s
  addComicJumpBoing(21.64, 280, 860, 0.46, 0.24);
  addSparkleChime(22.18, 1046.5, 0.34, 0.18);     // Dramatic Kiss-Wink Hero Hang Chime!
  addAirSwoosh(23.00, 0.52, 1.38, 0.26);          // Blazing Golden Paint-Zip!
  addPopBlip(23.54, 420, 1020, 0.16, 0.26);       // Portal absorption pop!
  addSparkleChime(23.58, 1174.7, 0.30, 0.18);     // Crew LED #3 Gold Lock (ALL ABOARD!)

  // 7. Palka Menutup -> Roket BLAST OFF ke Langit -> Clean Finale Chord!
  addHatchSlide(24.30, false, 0.28);
  addRocketThrust(24.80, 1.85, 0.70, 1.55, 0.42); // Mega Blast-Off!
  addAirSwoosh(25.10, 1.10, 1.35, 0.34);
  addWarmChord(25.75, 2.20, 0.24);                // Finale Studio End-Card Chord!
  addSparkleChime(25.85, 1046.5, 0.32, 0.14);

  // Soft-knee Limiter + Master Fade In/Out
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.08) out *= t / 0.08;
    if (t > DURATION - 0.55) out *= (DURATION - t) / 0.55;
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
  console.log(`      ✓ Audio Page 5 Finale siap: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, peak ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. RENDER 840 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderPage5Frames(htmlPath) {
  const forceRender = process.argv.includes("--force-frames");
  const lastFramePath = path.join(FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);

  if (!forceRender && fs.existsSync(lastFramePath)) {
    const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png"));
    if (files.length >= TOTAL_FRAMES) {
      console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_page5/ sudah lengkap! (Pakai --force-frames untuk render ulang)`);
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
      await page.waitForTimeout(150);

      for (let frame = fromF; frame < toF; frame++) {
        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        await page.screenshot({ path: frameFile, type: "png" });

        completedCount++;
        if (completedCount % 60 === 0 || completedCount === TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
          console.log(`      Progres render Page 5: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Page 5 selesai dirender!`);
}

// ============================================================================
// 3. ENCODE KE page5_outro.mp4 DENGAN FFMPEG (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodePage5Video() {
  console.log("[3/3] Menggabungkan 840 frame & audio menjadi page5_outro.mp4 dengan FFmpeg...");
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
  console.log(`\nSUKSES! Video Page 5 Finale selesai di: ${OUTPUT_MP4}`);
}

(async () => {
  const startTime = Date.now();
  try {
    generatePage5Audio(AUDIO_PATH);
    if (!process.argv.includes("--audio-only")) {
      const htmlPath = resolveHtmlPath();
      await renderPage5Frames(htmlPath);
      encodePage5Video();
    }
    console.log(`Total waktu proses: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Page 5:", err);
    process.exit(1);
  }
})();