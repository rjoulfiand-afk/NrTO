const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 21.5;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 645 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames_intro");
const AUDIO_PATH = path.join(__dirname, "audio_intro.wav");
const OUTPUT_MP4 = path.join(__dirname, "intro_joulfiand.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "intro.html") + "?headless=1";

// ============================================================================
// 1. SINTESIS AUDIO PROSEDURAL INTRO (21.5 Detik)
// ============================================================================
function generateIntroAudio(wavPath) {
  console.log("[1/3] Mensintesis audio sinematik & efek UI untuk Intro...");
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

  // Helper Swoosh Udara
  const addAirSwoosh = (startSec, durSec, brightness = 1.0, gain = 0.45) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.5);
      const cutoff = (0.02 + Math.sin(p * Math.PI) * 0.12) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      return (lp - hp) * env * gain * 2.2;
    });
  };

  // Helper Klik Mouse Asli
  const addMouseClick = (startSec) => {
    addSound(startSec, 0.04, (lt) => {
      const w = nextRand();
      const c1 = Math.exp(-lt * 480) * 0.85;
      const c2 = lt > 0.016 ? Math.exp(-(lt - 0.016) * 550) * 0.45 : 0;
      return w * (c1 + c2) * 0.65;
    });
  };

  // 1. Adegan 1 (0.1s): Cinematic Opener "Project Rixsan Joulfiand"
  addAirSwoosh(0.10, 0.75, 0.85, 0.50);
  addSound(0.15, 1.80, (lt) => {
    const env = Math.min(1, lt / 0.15) * Math.exp(-lt * 1.8);
    const chord = (
      Math.sin(2 * Math.PI * 110 * lt) * 0.5 +
      Math.sin(2 * Math.PI * 220 * lt) * 0.35 +
      Math.sin(2 * Math.PI * 329.63 * lt) * 0.25
    );
    return chord * env * 0.35;
  });

  // 2. Adegan 2 (2.2s): "Gemini AI Vs Claude Code" + Zoom Claude (3.8s)
  addAirSwoosh(2.20, 0.55, 1.15, 0.45);
  addAirSwoosh(3.80, 0.65, 1.30, 0.48);

  // 3. Adegan 3 (4.45s - 5.45s): Roda Claude Menggelinding Membuka Text Board
  for (let r = 0; r < 10; r++) {
    const rt = 4.45 + r * 0.095;
    addSound(rt, 0.05, (lt) => {
      const freq = 260 + r * 18;
      return Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 85) * 0.22;
    });
  }
  addAirSwoosh(4.45, 0.95, 1.0, 0.42);

  // 4. Adegan 4 (5.45s - 8.05s): Scroll Siluet Codingan Claude (Atas -> Bawah -> Atas)
  addAirSwoosh(5.50, 1.20, 0.75, 0.32);
  addAirSwoosh(6.85, 1.10, 1.10, 0.35);

  // 5. Adegan 5 (8.35s - 10.65s): Klik "Fable" -> Pilih "Opus 5.5 Extra" -> Klik Kirim -> Loading
  addMouseClick(8.38);
  addMouseClick(9.10);
  addSound(9.12, 0.25, (lt) => Math.sin(2 * Math.PI * 587.33 * lt) * Math.exp(-lt * 18) * 0.20);
  addMouseClick(9.78);
  addAirSwoosh(10.00, 0.60, 1.35, 0.48);

  // 6. Transisi Loading & Bintang Gemini Memancar (10.45s - 12.05s)
  addSound(10.50, 0.85, (lt) => {
    const sweep = 320 + lt * 520;
    return Math.sin(2 * Math.PI * sweep * lt) * Math.sin((lt / 0.85) * Math.PI) * 0.16;
  });
  // Shimmer Kristal Bintang Gemini (11.15s)
  addSound(11.15, 0.75, (lt) => {
    const env = Math.exp(-lt * 4.5);
    const s1 = Math.sin(2 * Math.PI * 523.25 * lt);
    const s2 = Math.sin(2 * Math.PI * 659.25 * lt) * 0.8;
    const s3 = Math.sin(2 * Math.PI * 783.99 * lt) * 0.6;
    const s4 = Math.sin(2 * Math.PI * 1046.5 * lt) * 0.4;
    return (s1 + s2 + s3 + s4) * env * 0.12;
  });
  addAirSwoosh(11.20, 0.80, 1.25, 0.42);

  // 7. Scroll Siluet Codingan Gemini (12.05s - 14.15s) + Pilih "Argon 4 High" + Kirim
  addAirSwoosh(12.10, 1.05, 0.80, 0.32);
  addAirSwoosh(13.20, 0.95, 1.15, 0.35);
  addMouseClick(14.42);
  addMouseClick(15.05);
  addSound(15.07, 0.25, (lt) => Math.sin(2 * Math.PI * 659.25 * lt) * Math.exp(-lt * 18) * 0.20);
  addMouseClick(15.58);
  addAirSwoosh(15.80, 0.55, 1.35, 0.48);

  // 8. Adegan 8 (16.55s - 18.60s): Sel Baterai ERD Mengisi Cepat (12 Tick Pengisian Daya)
  for (let c = 0; c < 12; c++) {
    const ct = 16.55 + (c / 12) * 2.00;
    const cellFreq = 340 + c * 32;
    addSound(ct, 0.08, (lt) => {
      const env = Math.exp(-lt * 48);
      return (Math.sin(2 * Math.PI * cellFreq * lt) + Math.sin(2 * Math.PI * cellFreq * 1.5 * lt) * 0.4) * env * 0.18;
    });
  }

  // 9. Adegan 9 (18.90s): Outro Impact "2 Model AI Tier Tertinggi di Adu"
  addAirSwoosh(18.85, 0.50, 0.90, 0.52);
  addSound(18.92, 1.80, (lt) => {
    const subEnv = Math.exp(-lt * 3.5);
    const subDrop = Math.sin(2 * Math.PI * (95 * Math.exp(-lt * 6) + 48) * lt) * subEnv * 0.55;
    const brassChord = (
      Math.sin(2 * Math.PI * 220 * lt) +
      Math.sin(2 * Math.PI * 277.18 * lt) * 0.8 +
      Math.sin(2 * Math.PI * 329.63 * lt) * 0.8 +
      Math.sin(2 * Math.PI * 440 * lt) * 0.6
    ) * Math.exp(-lt * 1.8) * 0.12;
    return subDrop + brassChord;
  });

  // Limiter & Fade In/Out
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.12) out *= t / 0.12;
    if (t > DURATION - 0.40) out *= (DURATION - t) / 0.40;
    samples[i] = Math.max(-0.98, Math.min(0.98, out));
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
  console.log(`      Audio Intro siap di: ${wavPath}`);
}

// ============================================================================
// 2. RENDER 645 FRAME DENGAN PLAYWRIGHT HEADLESS CHROMIUM
// ============================================================================
async function renderIntroFrames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (Supersampled 4K -> 1080x1920) dari intro.html...`);
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  } else {
    for (const f of fs.readdirSync(FRAMES_DIR)) {
      fs.unlinkSync(path.join(FRAMES_DIR, f));
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(HTML_PATH, { waitUntil: "load" });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;
    await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

    const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, type: "png" });

    if ((frame + 1) % 100 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres render Intro: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

// ============================================================================
// 3. GABUNGKAN FRAME + AUDIO MENJADI MP4 TAJAM (CRF 12)
// ============================================================================
function encodeIntroVideo() {
  console.log("[3/3] Menggabungkan frame & audio menjadi intro_joulfiand.mp4 dengan FFmpeg...");
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
  console.log(`\nSelesai! Video Intro siap di: ${OUTPUT_MP4}`);
}

(async () => {
  try {
    generateIntroAudio(AUDIO_PATH);
    await renderIntroFrames();
    encodeIntroVideo();
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    process.exit(1);
  }
})();