const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 18.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 540 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames_page2");
const AUDIO_PATH = path.join(__dirname, "audio_page2.wav");
const OUTPUT_MP4 = path.join(__dirname, "page2_proses.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "page2.html") + "?headless=1";

// ============================================================================
// 1. SINTESIS AUDIO EFEK SUARA HALAMAN 2 (18.00 DETIK)
// ============================================================================
function generatePage2Audio(wavPath) {
  console.log("[1/3] Mensintesis audio SFX Halaman 2 (18.00 detik)...");
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const samples = new Float32Array(numSamples);

  let prng = 271828183;
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

  const addAirSwoosh = (startSec, durSec, brightness = 1.0, gain = 0.42) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.5);
      const cutoff = (0.024 + Math.sin(p * Math.PI) * 0.12) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      return (lp - hp) * env * gain * 2.2;
    });
  };

  const addFocusTick = (startSec, freq = 620, gain = 0.60) => {
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

  // A. Transisi Morfologi Kartu Halaman 1 -> 2 Panel Proses (0.40s - 1.80s)
  addAirSwoosh(0.40, 0.85, 0.95, 0.46);

  // B. Bunyi Munculnya Baris Log & Penghitung 360 Frame (2.30s - 7.30s)
  const logTimes = [2.30, 2.70, 3.10, 3.60, 4.30, 5.10, 6.20, 7.10];
  logTimes.forEach((lt, idx) => {
    addFocusTick(lt, 540 + (idx % 3) * 30, 0.42);
  });

  // Desir halus saat penghitung 0 -> 360 frame berjalan cepat (4.20s - 7.40s)
  for (let tTick = 4.25; tTick < 7.35; tTick += 0.14) {
    let lp = 0;
    addSound(tTick, 0.022, (lt) => {
      lp += 0.24 * (nextRand() - lp);
      return lp * Math.exp(-lt * 380) * 0.20;
    });
  }

  // C. 3 Fokus Kotak Iris Kuning pada Pembeda Arsitektur (3.35s, 5.15s, 7.00s)
  addFocusTick(3.35, 640, 0.68);
  addAirSwoosh(4.90, 0.42, 1.15, 0.34);
  addFocusTick(5.25, 640, 0.68);
  addAirSwoosh(6.75, 0.42, 1.15, 0.34);
  addFocusTick(7.10, 640, 0.68);

  // D. Pergantian ke Tampilan Audit Laboratorium 16 Warna & ffprobe (9.50s)
  addAirSwoosh(9.50, 0.65, 1.05, 0.44);

  // Tick verifikasi 16 kotak warna & 5 centang hijau ffprobe (9.90s - 13.00s)
  for (let c = 0; c < 16; c++) {
    const ct = 9.85 + (c / 16) * 2.60;
    addFocusTick(ct, 720, 0.28);
  }
  const checkTimes = [10.35, 10.92, 11.50, 12.06, 12.65];
  checkTimes.forEach((chkT) => {
    addSound(chkT, 0.12, (lt) => {
      const env = Math.exp(-lt * 32);
      return (Math.sin(2 * Math.PI * 880 * lt) + Math.sin(2 * Math.PI * 1318.5 * lt) * 0.5) * env * 0.16;
    });
  });

  // E. Mengunci Menjadi 2 Layar Halaman 3 + Hook "MANA HASIL YANG LEBIH BAIK?" (14.45s)
  addAirSwoosh(14.45, 0.70, 0.85, 0.48);
  addSound(14.55, 0.35, (lt) => {
    const subEnv = Math.exp(-lt * 16);
    return Math.sin(2 * Math.PI * (140 * Math.exp(-lt * 10) + 55) * lt) * subEnv * 0.38;
  });

  // F. LETSGO!! Impact & Ignition Riser (15.40s)
  addAirSwoosh(15.35, 0.45, 1.30, 0.48);
  addSound(15.42, 0.55, (lt) => {
    const subEnv = Math.exp(-lt * 12);
    const subDrop = Math.sin(2 * Math.PI * (180 * Math.exp(-lt * 14) + 60) * lt) * subEnv * 0.46;
    const chime = Math.sin(2 * Math.PI * 987.77 * lt) * Math.exp(-lt * 35) * 0.18;
    return subDrop + chime;
  });

  // Limiter & Fade Bersih
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.08) out *= t / 0.08;
    if (t > DURATION - 0.30) out *= (DURATION - t) / 0.30;
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
  console.log(`      Audio SFX Halaman 2 siap di: ${wavPath}`);
}

// ============================================================================
// 2. RENDER 540 FRAME DENGAN PLAYWRIGHT HEADLESS CHROMIUM
// ============================================================================
async function renderPage2Frames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (Supersampled 4K -> 1080x1920) dari page2.html...`);
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

    if ((frame + 1) % 90 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres render Halaman 2: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

// ============================================================================
// 3. GABUNGKAN FRAME + AUDIO MENJADI page2_proses.mp4 (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodePage2Video() {
  console.log("[3/3] Menggabungkan frame & audio menjadi page2_proses.mp4 dengan FFmpeg...");
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
  console.log(`\nSelesai! Video Halaman 2 siap di: ${OUTPUT_MP4}`);
}

(async () => {
  try {
    generatePage2Audio(AUDIO_PATH);
    await renderPage2Frames();
    encodePage2Video();
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    process.exit(1);
  }
})();
