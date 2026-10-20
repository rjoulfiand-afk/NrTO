const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 19.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 570 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames_page1");
const AUDIO_PATH = path.join(__dirname, "audio_page1.wav");
const OUTPUT_MP4 = path.join(__dirname, "page1_prompt.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "page1.html") + "?headless=1";

// ============================================================================
// 1. SINTESIS AUDIO HALAMAN 1
//    - Suara Ketikan Keyboard Mekanik/Laptop Asli (Broadband Filtered Transient,
//      0% gelombang sinus/beep, jernih & tidak mendem)
//    - Suara Fokus Iris Netral & Konsisten (Bukan tangga nada doremifasolasido!)
// ============================================================================
function generatePage1Audio(wavPath) {
  console.log("[1/3] Mensintesis audio Halaman 1 (Realistic Keyboard & Subtle Focus Tick)...");
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

  // A. Suara Ayunan Sapu / Swoosh Udara Halus
  const addAirSwoosh = (startSec, durSec, brightness = 1.0, gain = 0.42) => {
    let lp = 0, hp = 0;
    addSound(startSec, durSec, (lt, d) => {
      const p = lt / d;
      const env = Math.sin(p * Math.PI) * Math.pow(1 - p, 0.5);
      const cutoff = (0.025 + Math.sin(p * Math.PI) * 0.12) * brightness;
      const w = nextRand();
      lp += cutoff * (w - lp);
      hp += 0.008 * (lp - hp);
      const band = lp - hp;
      return band * env * gain * 2.2;
    });
  };

  addAirSwoosh(0.08, 0.40, 1.0, 0.40); // Badge Gemini masuk
  addAirSwoosh(0.18, 0.40, 1.15, 0.40); // Badge Claude masuk
  addAirSwoosh(0.40, 0.45, 0.85, 0.42); // Kotak prompt.txt membuka

  // B. SUARA KETIKAN KEYBOARD ASLI (0.85s - 8.20s)
  // 100% Akustik Broadband Transient (Tanpa nada sinus/beep, tidak mendem!)
  // Menggabungkan High-Mid Keycap Tap (1.2kHz-2.8kHz) + Mid Switch Housing (450Hz-950Hz)
  let tKey = 0.85;
  let keyIdx = 0;
  while (tKey < 8.18) {
    const isSpace = (keyIdx % 7 === 6);
    const vel = 0.78 + ((keyIdx * 31) % 9) * 0.028;

    // Koefisien filter sedikit bervariasi per tuts seperti jari di papan ketik asli
    const topCut = isSpace ? 0.24 : (0.32 + ((keyIdx * 17) % 7) * 0.022);
    const bodyCut = isSpace ? 0.085 : (0.11 + ((keyIdx * 23) % 5) * 0.01);

    let lpTop = 0, hpTop = 0;
    let lpBody = 0, hpBody = 0;

    addSound(tKey, 0.032, (lt) => {
      const w = nextRand();

      // 1. Sentuhan awal kuku/jari pada permukaan keycap (jernih & renyah, 0.8ms - 5ms)
      lpTop += topCut * (w - lpTop);
      hpTop += 0.14 * (lpTop - hpTop);
      const keycapSnap = (lpTop - hpTop) * Math.exp(-lt * 420);

      // 2. Tumpuan mekanis tuts (Switch Bottom-Out, 2ms - 18ms, tanpa frekuensi sub-bass yang mendem)
      lpBody += bodyCut * (w - lpBody);
      hpBody += 0.045 * (lpBody - hpBody);
      const switchBody = (lpBody - hpBody) * Math.exp(-lt * 175);

      // Pantulan mikro saat tuts dilepas (key release, pada +14ms)
      const relEnv = lt > 0.014 ? Math.exp(-(lt - 0.014) * 520) * 0.28 : 0;
      const releaseTap = (lpTop - hpTop) * relEnv;

      return (keycapSnap * 0.95 + switchBody * 1.15 + releaseTap) * 0.68 * vel;
    });

    // Jeda ketikan manusia (sedikit lebih tenang & alami)
    let step = 0.072 + ((keyIdx * 19) % 5) * 0.012;
    if (isSpace) step += 0.035;
    if (keyIdx % 16 === 15) step += 0.14;
    if (keyIdx % 33 === 32) step += 0.22;
    tKey += step;
    keyIdx++;
  }

  // C. SUARA FOKUS IRIS KUNING (8.80s - 12.24s)
  // Konsisten & Netral (Subtle Camera Focus / Mechanical Aperture Tick — BUKAN tangga nada!)
  const scanLockTimes = [8.80, 9.23, 9.66, 10.09, 10.52, 10.95, 11.38, 11.81, 12.24];
  scanLockTimes.forEach((st, idx) => {
    let lp = 0, hp = 0;
    // Variasi mikro hanya +/- 1.5% agar organik tapi nadanya tetap datar/netral
    const fixedFreq = 620 + (idx % 2 === 0 ? 6 : -6);
    addSound(st, 0.045, (lt) => {
      const w = nextRand();
      lp += 0.28 * (w - lp);
      hp += 0.10 * (lp - hp);
      const tickNoise = (lp - hp) * Math.exp(-lt * 320) * 0.45;
      const focusPulse = Math.sin(2 * Math.PI * fixedFreq * lt) * Math.exp(-lt * 140) * 0.18;
      return (tickNoise + focusPulse) * 0.65;
    });
  });

  // D. Suara Scroll Balik ke Atas (12.35s) & Meluncur Halus Menjadi Bar Bawah (13.60s)
  addAirSwoosh(12.35, 0.60, 1.15, 0.36);
  addAirSwoosh(13.60, 0.80, 0.85, 0.38);

  // E. Suara Klik Mouse Asli pada Tombol Kirim [↑] (15.24s)
  addSound(15.24, 0.040, (lt) => {
    const w = nextRand();
    // Double-transient khas microswitch mouse (tekan pada 0ms, lepas pada 18ms)
    const downClick = Math.exp(-lt * 480) * 0.85;
    const upClick = lt > 0.018 ? Math.exp(-(lt - 0.018) * 550) * 0.45 : 0;
    return w * (downClick + upClick) * 0.65;
  });

  // Desir halus saat prompt meluncur naik ke tengah layar (15.26s)
  addAirSwoosh(15.26, 0.42, 1.25, 0.42);

  // F. Suara 2 Kartu AI ("Gemini Code" & "Claude Code") Mendarat Halus (15.65s & 15.74s)
  const addSoftCardSettle = (startSec, toneHz) => {
    let lp = 0;
    addSound(startSec, 0.18, (lt) => {
      const w = nextRand();
      lp += 0.12 * (w - lp);
      const softTap = lp * Math.exp(-lt * 95) * 0.40;
      const body = Math.sin(2 * Math.PI * toneHz * Math.exp(-lt * 12) * lt) * Math.exp(-lt * 28) * 0.24;
      return softTap + body;
    });
  };
  addSoftCardSettle(15.65, 180);
  addSoftCardSettle(15.74, 210);

  // G. Suara Stempel "1× KIRIM · 0 REVISI" (17.15s)
  addSoftCardSettle(17.15, 150);
  addAirSwoosh(17.13, 0.25, 0.90, 0.32);

  // Final Limiter & Fade In/Out Bersih (Tanpa Drone Rendah yang Membuat Mendem)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = samples[i];
    if (t < 0.10) out *= t / 0.10;
    if (t > DURATION - 0.35) out *= (DURATION - t) / 0.35;
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
  console.log(`      Audio Halaman 1 siap di: ${wavPath}`);
}

// ============================================================================
// 2. RENDER 570 FRAME DENGAN PLAYWRIGHT HEADLESS CHROMIUM
// ============================================================================
async function renderPage1Frames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame (Supersampled 4K -> 1080x1920) dari page1.html...`);
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  } else {
    // Bersihkan sisa frame lama jika ada
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

    if ((frame + 1) % 95 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres render Halaman 1: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

// ============================================================================
// 3. GABUNGKAN FRAME + AUDIO MENJADI MP4 TAJAM (CRF 12)
// ============================================================================
function encodePage1Video() {
  console.log("[3/3] Menggabungkan frame & audio menjadi page1_prompt.mp4 dengan FFmpeg...");
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
  console.log(`\nSelesai! Video Halaman 1 siap di: ${OUTPUT_MP4}`);
}

(async () => {
  try {
    generatePage1Audio(AUDIO_PATH);
    await renderPage1Frames();
    encodePage1Video();
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    process.exit(1);
  }
})();