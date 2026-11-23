const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 46.0; // Master Intro Lengkap (46.00 Detik · 1380 Frame @ 30 FPS)
const TOTAL_FRAMES = Math.round(FPS * DURATION);
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

const FRAMES_DIR = path.join(__dirname, "frames_intro");
const AUDIO_PATH = path.join(__dirname, "audio_intro.wav");
const OUTPUT_MP4 = path.join(__dirname, "intro_joulfiand.mp4");

function resolveHtmlPath() {
  const candidates = ["intro.html", "intro_3.html", "intro_2.html"];
  for (const name of candidates) {
    const full = path.resolve(__dirname, name);
    if (fs.existsSync(full)) {
      console.log(`      ✓ Sumber HTML ditemukan: ${name}`);
      return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
    }
  }
  throw new Error("File intro.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. SINTESIS AUDIO MASTER INTRO (46.00 DETIK · ZERO CLASH · 0ms DESYNC)
// ============================================================================
function generateMasterIntroAudio(wavPath) {
  console.log(`[1/3] Mensintesis audio Master Intro (${DURATION.toFixed(2)} detik, sinkron 11 beat)...`);
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 246813579;
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

  const addAirSwoosh = (startSec, durSec = 0.50, brightness = 1.0, gain = 0.32) => {
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

  const addMouseClick = (startSec) => {
    addSound(startSec, 0.04, (lt) => {
      const w = nextRand();
      const c1 = Math.exp(-lt * 480) * 0.85;
      const c2 = lt > 0.016 ? Math.exp(-(lt - 0.016) * 550) * 0.45 : 0;
      return w * (c1 + c2) * 0.55;
    });
  };

  const addSoftSettle = (startSec, startHz = 210, endHz = 120, gain = 0.34) => {
    let lp = 0;
    addSound(startSec, 0.20, (lt) => {
      const w = nextRand();
      lp += 0.14 * (w - lp);
      const tap = lp * Math.exp(-lt * 85) * 0.32;
      const freq = endHz + (startHz - endHz) * Math.exp(-lt * 22);
      const body = Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 24) * 0.68;
      return (tap + body) * gain;
    });
  };

  const addPopBlip = (startSec, fStart = 520, fEnd = 780, durSec = 0.14, gain = 0.22) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.006) * Math.exp(-lt * 26) * (1 - p * 0.3);
      const freq = fStart + (fEnd - fStart) * (1 - Math.exp(-lt * 32));
      phase += (2 * Math.PI * freq) / sampleRate;
      return (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2) * env * gain;
    });
  };

  const addSparkleChime = (startSec, baseFreq = 783.99, durSec = 0.26, gain = 0.16) => {
    addSound(startSec, durSec, (lt) => {
      const env = Math.min(1, lt / 0.005) * Math.exp(-lt * 15);
      return (Math.sin(2 * Math.PI * baseFreq * lt) + Math.sin(2 * Math.PI * baseFreq * 1.5 * lt) * 0.30) * env * gain;
    });
  };

  const addWindUpZip = (startSec, durSec = 0.32, gain = 0.18) => {
    let phase = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      phase += (2 * Math.PI * (230 + p * p * 340)) / sampleRate;
      return Math.sin(phase) * Math.sin(p * Math.PI) * 0.9 * gain;
    });
  };

  const addComicBump = (startSec, gain = 0.60) => {
    let phase = 0, lp = 0;
    addSound(startSec, 0.34, (lt) => {
      phase += (2 * Math.PI * (68 + 195 * Math.exp(-lt * 34))) / sampleRate;
      const body = Math.sin(phase) * Math.exp(-lt * 14) * 0.82;
      const w = nextRand();
      lp += 0.36 * (w - lp);
      return (body + lp * Math.exp(-lt * 165) * 0.45) * gain;
    });
  };

  const addFloorSkid = (startSec, durSec = 0.58, gain = 0.24) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.min(1, lt / 0.03) * Math.pow(1 - p, 1.35);
      const w = nextRand();
      lp += 0.18 * (1 - p * 0.65) * (w - lp);
      hp += 0.025 * (lp - hp);
      return (lp - hp) * env * gain * 2.4;
    });
  };

  const addAngryStomp = (startSec, gain = 0.26) => {
    let phase = 0, lp = 0;
    addSound(startSec, 0.16, (lt) => {
      phase += (2 * Math.PI * (58 + 115 * Math.exp(-lt * 42))) / sampleRate;
      const w = nextRand();
      lp += 0.18 * (w - lp);
      return (Math.sin(phase) * Math.exp(-lt * 26) * 0.8 + lp * Math.exp(-lt * 90) * 0.35) * gain;
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

  const addWarmChord = (startSec, durSec = 1.75, gain = 0.24) => {
    addSound(startSec, durSec, (lt, d) => {
      const env = Math.min(1, lt / 0.10) * Math.exp(-lt * 1.9) * Math.min(1, (d - lt) / 0.25);
      const chord = (
        Math.sin(2 * Math.PI * 110.00 * lt) * 0.45 +
        Math.sin(2 * Math.PI * 220.00 * lt) * 0.34 +
        Math.sin(2 * Math.PI * 329.63 * lt) * 0.26 +
        Math.sin(2 * Math.PI * 440.00 * lt) * 0.15
      );
      return chord * env * gain;
    });
  };

  // --------------------------------------------------------------------------
  // BEAT 1 (0.00s - 3.20s): OPENER "Project Rixsan Joulfiand"
  // --------------------------------------------------------------------------
  addAirSwoosh(0.08, 0.72, 0.85, 0.38);
  addWarmChord(0.15, 1.75, 0.26);

  // --------------------------------------------------------------------------
  // BEAT 2 (3.20s - 24.20s): SKIT 3D ROGER & MERRY + POLAROID jull.jpeg
  // --------------------------------------------------------------------------
  // Masuk Stage
  addAirSwoosh(3.35, 0.42, 0.95, 0.24);
  addAirSwoosh(3.52, 0.42, 1.15, 0.24);
  addSoftSettle(3.95, 220, 125, 0.32);
  addSoftSettle(4.12, 330, 210, 0.28);

  // Roger Halo (4.50s)
  addAirSwoosh(4.48, 0.45, 1.00, 0.26);
  addPopBlip(4.65, 420, 580, 0.14, 0.20);
  addFocusTick(4.70, 580, 0.34);

  // Roger Kenalan + Emote ! (7.18s)
  addPopBlip(7.16, 520, 820, 0.15, 0.24);
  addSparkleChime(7.24, 880.0, 0.24, 0.15);
  addSoftSettle(7.45, 195, 130, 0.20);

  // Merry Ancang-ancang & SENGGOL ROGER! (9.60s -> IMPACT 10.15s)
  addWindUpZip(9.62, 0.32, 0.18);
  addAirSwoosh(9.96, 0.24, 1.45, 0.38);
  addComicBump(10.15, 0.60);
  addFloorSkid(10.19, 0.60, 0.25);
  addPopBlip(10.22, 390, 690, 0.14, 0.18);
  addPopBlip(10.38, 620, 880, 0.12, 0.16);

  // Roger Kesal "Woi apaan sih!" (12.45s)
  addAirSwoosh(12.42, 0.35, 0.90, 0.26);
  addAngryStomp(12.52, 0.34);
  addFocusTick(12.56, 480, 0.44);
  addAngryStomp(13.05, 0.22);
  addAngryStomp(13.55, 0.20);

  // Merry Nyaut Sassy (15.25s)
  addAirSwoosh(15.22, 0.42, 1.25, 0.28);
  addPopBlip(15.38, 760, 560, 0.16, 0.22);
  addFocusTick(15.52, 700, 0.34);

  // Merry Kenalan Ceria (17.75s)
  addSparkleChime(17.75, 523.25, 0.24, 0.15);
  addSparkleChime(17.83, 659.25, 0.24, 0.15);
  addSparkleChime(17.91, 783.99, 0.26, 0.16);
  addSparkleChime(17.99, 1046.5, 0.30, 0.15);
  addAirSwoosh(18.08, 0.36, 1.35, 0.18);

  // Duet Bareng + Polaroid jull.jpeg + Logo Asli Gemini & Claude (20.50s)
  addAirSwoosh(20.48, 0.58, 1.05, 0.34);
  addSoftSettle(20.70, 210, 115, 0.36);
  addWarmChord(20.72, 2.00, 0.22);
  addSparkleChime(20.95, 880.0, 0.24, 0.15);
  addSparkleChime(21.06, 659.25, 0.24, 0.15);

  // --------------------------------------------------------------------------
  // BEAT 3 (24.20s - 27.00s): DUEL VS "Gemini AI VS Claude Code" + ZOOM CLAUDE
  // --------------------------------------------------------------------------
  addAirSwoosh(24.18, 0.52, 1.15, 0.36);
  addAirSwoosh(25.72, 0.58, 1.30, 0.38);

  // --------------------------------------------------------------------------
  // BEAT 4 (27.00s - 32.85s): CLAUDE WORKSPACE (Opus 5.5 Extra)
  // --------------------------------------------------------------------------
  for (let r = 0; r < 8; r++) {
    const rt = 27.05 + r * 0.10;
    addSound(rt, 0.05, (lt) => Math.sin(2 * Math.PI * (260 + r * 20) * lt) * Math.exp(-lt * 85) * 0.18);
  }
  addAirSwoosh(27.05, 0.85, 1.00, 0.34);
  addAirSwoosh(27.95, 1.00, 0.75, 0.26);
  addAirSwoosh(29.15, 0.95, 1.10, 0.28);
  addMouseClick(30.60);
  addMouseClick(31.50);
  addSparkleChime(31.52, 587.33, 0.24, 0.18);
  addSparkleChime(31.60, 880.00, 0.26, 0.14); // Spec Dock Power-Up
  addMouseClick(32.15);
  addAirSwoosh(32.38, 0.50, 1.35, 0.36);

  // --------------------------------------------------------------------------
  // BEAT 5 (32.75s - 39.25s): LOADING MORPH -> GEMINI STUDIO (Argon 4 High)
  // --------------------------------------------------------------------------
  addSound(32.80, 0.82, (lt) => {
    const sweep = 320 + lt * 500;
    return Math.sin(2 * Math.PI * sweep * lt) * Math.sin((lt / 0.82) * Math.PI) * 0.14;
  });
  addSound(33.80, 0.72, (lt) => {
    const env = Math.exp(-lt * 4.5);
    return (
      Math.sin(2 * Math.PI * 523.25 * lt) +
      Math.sin(2 * Math.PI * 659.25 * lt) * 0.75 +
      Math.sin(2 * Math.PI * 783.99 * lt) * 0.55 +
      Math.sin(2 * Math.PI * 1046.5 * lt) * 0.35
    ) * env * 0.11;
  });
  addAirSwoosh(33.82, 0.75, 1.25, 0.34);
  addAirSwoosh(34.60, 0.95, 0.80, 0.26);
  addAirSwoosh(35.65, 0.90, 1.15, 0.28);
  addMouseClick(37.00);
  addMouseClick(37.90);
  addSparkleChime(37.92, 659.25, 0.24, 0.18);
  addSparkleChime(38.00, 987.77, 0.26, 0.14); // Spec Dock Power-Up
  addMouseClick(38.55);
  addAirSwoosh(38.77, 0.48, 1.35, 0.36);

  // --------------------------------------------------------------------------
  // BEAT 6 (39.20s - 42.85s): ERD MATRIX + 14 SEL BATERAI TOKEN
  // --------------------------------------------------------------------------
  for (let c = 0; c < 14; c++) {
    const ct = 39.50 + (c / 14) * 2.65;
    const cellFreq = 330 + c * 28;
    addSound(ct, 0.08, (lt) => {
      const env = Math.exp(-lt * 48);
      return (Math.sin(2 * Math.PI * cellFreq * lt) + Math.sin(2 * Math.PI * cellFreq * 1.5 * lt) * 0.35) * env * 0.14;
    });
  }

  // --------------------------------------------------------------------------
  // BEAT 7 (42.80s - 46.00s): SHOWDOWN FINALE "2 Model AI Tier Tertinggi di Adu."
  // --------------------------------------------------------------------------
  addAirSwoosh(42.78, 0.50, 0.92, 0.40);
  addSound(42.85, 2.10, (lt, d) => {
    const subDrop = Math.sin(2 * Math.PI * (95 * Math.exp(-lt * 6) + 48) * lt) * Math.exp(-lt * 3.6) * 0.46;
    const brassChord = (
      Math.sin(2 * Math.PI * 220.00 * lt) +
      Math.sin(2 * Math.PI * 277.18 * lt) * 0.78 +
      Math.sin(2 * Math.PI * 329.63 * lt) * 0.78 +
      Math.sin(2 * Math.PI * 440.00 * lt) * 0.55
    ) * Math.exp(-lt * 1.8) * Math.min(1, (d - lt) / 0.30) * 0.11;
    return subDrop + brassChord;
  });
  addFocusTick(43.55, 740, 0.36); // Next Chapter pill handover

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
  console.log(`      ✓ Audio Master Intro siap: ${wavPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, peak ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. RENDER 1380 FRAME DENGAN PLAYWRIGHT MULTI-WORKER HEADLESS CHROMIUM
// ============================================================================
async function renderIntroFrames(htmlPath) {
  const forceRender = process.argv.includes("--force-frames");
  const lastFramePath = path.join(FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);

  if (!forceRender && fs.existsSync(lastFramePath)) {
    const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png"));
    if (files.length >= TOTAL_FRAMES) {
      console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_intro/ sudah lengkap! (Pakai --force-frames untuk render ulang)`);
      return;
    }
  }

  if (fs.existsSync(path.join(__dirname, "jull.jpeg"))) {
    console.log("      ✓ Foto profil jull.jpeg ditemukan & siap dimuat.");
  } else {
    console.warn("      ! Peringatan: jull.jpeg belum ada di folder ini (akan memakai placeholder).");
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
      await page.waitForTimeout(250);

      for (let frame = fromF; frame < toF; frame++) {
        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        await page.screenshot({ path: frameFile, type: "png" });

        completedCount++;
        if (completedCount % 60 === 0 || completedCount === TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
          console.log(`      Progres render Master Intro: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Master Intro selesai dirender!`);
}

// ============================================================================
// 3. ENCODE KE intro_joulfiand.mp4 DENGAN FFMPEG (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodeIntroVideo() {
  console.log("[3/3] Menggabungkan 1380 frame & audio menjadi intro_joulfiand.mp4 dengan FFmpeg...");
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
  console.log(`\nSUKSES! Video Master Intro selesai di: ${OUTPUT_MP4}`);
}

(async () => {
  const startTime = Date.now();
  try {
    generateMasterIntroAudio(AUDIO_PATH);
    if (!process.argv.includes("--audio-only")) {
      const htmlPath = resolveHtmlPath();
      await renderIntroFrames(htmlPath);
      encodeIntroVideo();
    }
    console.log(`Total waktu proses: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Master Intro:", err);
    process.exit(1);
  }
})();