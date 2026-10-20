const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 70.00; // 70 Detik Santai & Terkalibrasi Naskah
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 2100 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames_final");
const AUDIO_PATH = path.join(__dirname, "audio_final.wav");
const OUTPUT_MP4 = path.join(__dirname, "final_joulfiand.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "final.html") + "?headless=1";

function generateFinalAudio(wavPath) {
  console.log("[1/3] Mensintesis audio sinematik 70.00 detik sinkron naskah...");
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

  const addMouseClick = (startSec) => {
    addSound(startSec, 0.04, (lt) => {
      const w = nextRand();
      const c1 = Math.exp(-lt * 480) * 0.85;
      const c2 = lt > 0.016 ? Math.exp(-(lt - 0.016) * 550) * 0.45 : 0;
      return w * (c1 + c2) * 0.65;
    });
  };

  // 1. Pembuka (0.10s)
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

  // 2. VS Masuk (5.50s) & Zoom Claude (7.90s)
  addAirSwoosh(5.50, 0.55, 1.15, 0.45);
  addAirSwoosh(7.90, 0.65, 1.25, 0.46);

  // 3. Claude Wheel (9.80s) & Code Scroll (10.90s, 12.60s)
  for (let r = 0; r < 10; r++) {
    const rt = 9.85 + r * 0.095;
    addSound(rt, 0.05, (lt) => {
      const freq = 260 + r * 18;
      return Math.sin(2 * Math.PI * freq * lt) * Math.exp(-lt * 85) * 0.22;
    });
  }
  addAirSwoosh(9.85, 0.95, 1.0, 0.42);
  addAirSwoosh(10.90, 1.20, 0.75, 0.32);
  addAirSwoosh(12.60, 1.10, 1.10, 0.35);

  // 4. Pilih Opus 5.5 Extra (15.15s, 16.30s, 17.40s)
  addMouseClick(15.15);
  addMouseClick(16.30);
  addSound(16.32, 0.25, (lt) => Math.sin(2 * Math.PI * 587.33 * lt) * Math.exp(-lt * 18) * 0.20);
  addMouseClick(17.40);
  addAirSwoosh(17.65, 0.60, 1.35, 0.48);

  // 5. Loading Ring (18.10s) & Shimmer Gemini (19.40s)
  addSound(18.10, 0.95, (lt) => {
    const sweep = 320 + lt * 520;
    return Math.sin(2 * Math.PI * sweep * lt) * Math.sin((lt / 0.95) * Math.PI) * 0.16;
  });
  addSound(19.40, 0.75, (lt) => {
    const env = Math.exp(-lt * 4.5);
    const s1 = Math.sin(2 * Math.PI * 523.25 * lt);
    const s2 = Math.sin(2 * Math.PI * 659.25 * lt) * 0.8;
    const s3 = Math.sin(2 * Math.PI * 783.99 * lt) * 0.6;
    const s4 = Math.sin(2 * Math.PI * 1046.5 * lt) * 0.4;
    return (s1 + s2 + s3 + s4) * env * 0.12;
  });
  addAirSwoosh(19.45, 0.80, 1.25, 0.42);

  // 6. Gemini Code Scroll (20.30s, 21.80s) & Pilih Argon 4 High (23.75s, 24.90s, 26.05s)
  addAirSwoosh(20.30, 1.10, 0.80, 0.32);
  addAirSwoosh(21.80, 1.00, 1.15, 0.35);
  addMouseClick(23.75);
  addMouseClick(24.90);
  addSound(24.92, 0.25, (lt) => Math.sin(2 * Math.PI * 659.25 * lt) * Math.exp(-lt * 18) * 0.20);
  addMouseClick(26.05);
  addAirSwoosh(26.30, 0.60, 1.35, 0.48);

  // 7. Sel Baterai ERD Mengisi Santai (27.60s - 32.00s)
  for (let c = 0; c < 14; c++) {
    const ct = 27.60 + (c / 14) * 4.40;
    const cellFreq = 330 + c * 28;
    addSound(ct, 0.08, (lt) => {
      const env = Math.exp(-lt * 45);
      return (Math.sin(2 * Math.PI * cellFreq * lt) + Math.sin(2 * Math.PI * cellFreq * 1.5 * lt) * 0.4) * env * 0.16;
    });
  }

  // 8. Outro Impact Tanpa Petir Alay (33.00s)
  addAirSwoosh(32.95, 0.50, 0.90, 0.52);
  addSound(33.05, 1.80, (lt) => {
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

  // 9. Transisi ke Halaman 1 (37.80s)
  addAirSwoosh(37.80, 0.55, 1.15, 0.45);
  addSound(37.85, 0.20, (lt) => Math.sin(2 * Math.PI * 440 * lt) * Math.exp(-lt * 24) * 0.15);
  addAirSwoosh(38.20, 0.45, 0.85, 0.42);

  // 10. Suara Ketikan Keyboard Mekanik Jernih (38.60s - 49.50s)
  let tKey = 38.60;
  let keyIdx = 0;
  while (tKey < 49.45) {
    const isSpace = (keyIdx % 7 === 6);
    const vel = 0.78 + ((keyIdx * 31) % 9) * 0.028;
    const topCut = isSpace ? 0.24 : (0.32 + ((keyIdx * 17) % 7) * 0.022);
    const bodyCut = isSpace ? 0.085 : (0.11 + ((keyIdx * 23) % 5) * 0.01);

    let lpTop = 0, hpTop = 0;
    let lpBody = 0, hpBody = 0;

    addSound(tKey, 0.032, (lt) => {
      const w = nextRand();
      lpTop += topCut * (w - lpTop);
      hpTop += 0.14 * (lpTop - hpTop);
      const keycapSnap = (lpTop - hpTop) * Math.exp(-lt * 420);

      lpBody += bodyCut * (w - lpBody);
      hpBody += 0.045 * (lpBody - hpBody);
      const switchBody = (lpBody - hpBody) * Math.exp(-lt * 175);

      const relEnv = lt > 0.014 ? Math.exp(-(lt - 0.014) * 520) * 0.28 : 0;
      const releaseTap = (lpTop - hpTop) * relEnv;

      return (keycapSnap * 0.95 + switchBody * 1.15 + releaseTap) * 0.68 * vel;
    });

    let step = 0.072 + ((keyIdx * 19) % 5) * 0.012;
    if (isSpace) step += 0.035;
    if (keyIdx % 16 === 15) step += 0.14;
    if (keyIdx % 33 === 32) step += 0.22;
    tKey += step;
    keyIdx++;
  }

  // 11. 5 Tick Fokus Iris Kuning Pas di 5 Poin Bintang Naskah
  const scanLockTimes = [52.80, 54.40, 56.00, 57.60, 59.40];
  scanLockTimes.forEach((st, idx) => {
    let lp = 0, hp = 0;
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

  // 12. Lipat Bar & Klik Kirim (61.40s, 64.00s)
  addAirSwoosh(61.40, 0.80, 0.85, 0.38);
  addSound(64.00, 0.040, (lt) => {
    const w = nextRand();
    const downClick = Math.exp(-lt * 480) * 0.85;
    const upClick = lt > 0.018 ? Math.exp(-(lt - 0.018) * 550) * 0.45 : 0;
    return w * (downClick + upClick) * 0.65;
  });
  addAirSwoosh(64.02, 0.42, 1.25, 0.42);

  // 13. Pendaratan Kartu AI (64.60s, 64.72s) & Stempel 1x Kirim 0 Revisi (66.50s)
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
  addSoftCardSettle(64.60, 180);
  addSoftCardSettle(64.72, 210);

  addSoftCardSettle(66.50, 150);
  addAirSwoosh(66.48, 0.25, 0.90, 0.32);

  // Master Limiter
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
  console.log(`      Audio Final tersinkron naskah siap di: ${wavPath}`);
}

async function renderFinalFrames() {
  console.log(`[2/3] Merender ${TOTAL_FRAMES} frame dari final.html...`);
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

    if ((frame + 1) % 150 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres render Final: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

function encodeFinalVideo() {
  console.log("[3/3] Menggabungkan frame & audio menjadi final_joulfiand.mp4 dengan FFmpeg...");
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
  console.log(`\nSelesai! Video Final siap diposting di: ${OUTPUT_MP4}`);
}

(async () => {
  try {
    generateFinalAudio(AUDIO_PATH);
    await renderFinalFrames();
    encodeFinalVideo();
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    process.exit(1);
  }
})();