const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 12;
const TOTAL_FRAMES = FPS * DURATION; // 360 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames");
const AUDIO_PATH = path.join(__dirname, "audio.wav");
const OUTPUT_MP4 = path.join(__dirname, "rocket_launch_pixelart.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "animation.html") + "?headless=1";

// ============================================================================
// 1. SINTESIS MUSIK LATAR CHIPTUNE & EFEK SUARA DARI KODE
// ============================================================================
function generateProceduralAudio(wavPath) {
  console.log("[1/3] Mensintesis musik chiptune & efek suara (termasuk Stage Separation)...");
  const sampleRate = 44100;
  const numSamples = sampleRate * DURATION;
  const samples = new Float32Array(numSamples);

  const square = (phase, duty = 0.5) => (((phase % 1 + 1) % 1) < duty ? 1.0 : -1.0);
  const triangle = (phase) => {
    const p = (phase % 1 + 1) % 1;
    return p < 0.5 ? 4.0 * p - 1.0 : 3.0 - 4.0 * p;
  };
  const midiToFreq = (m) => 440.0 * Math.pow(2, (m - 69) / 12);

  const melodyScene1 = [60, 64, 67, 72, 60, 64, 67, 71];
  const melodyScene2 = [62, 65, 69, 74, 64, 67, 71, 76, 65, 69, 72, 77, 67, 71, 74, 79];
  const melodyScene3 = [72, 76, 79, 84, 83, 79, 76, 72, 74, 77, 81, 86, 84, 79, 76, 72];

  let noiseLP = 0;
  let prng = 123456789;
  const nextRand = () => {
    prng = (1664525 * prng + 1013904223) >>> 0;
    return (prng / 4294967296) * 2.0 - 1.0;
  };

  let leadPhase = 0;
  let bassPhase = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let out = 0.0;

    // --- A. MUSIK LATAR CHIPTUNE ---
    const stepRate = 8.0;
    const stepIdx = Math.floor(t * stepRate);
    const stepFrac = (t * stepRate) % 1.0;
    const env = Math.exp(-stepFrac * 3.2);

    let noteMidi = 60;
    let bassMidi = 36;
    if (t < 4.0) {
      noteMidi = melodyScene1[stepIdx % melodyScene1.length];
      bassMidi = 36 + (Math.floor(t) % 2) * 5;
    } else if (t < 8.0) {
      const idx = Math.min(melodyScene2.length - 1, Math.floor(((t - 4.0) / 4.0) * melodyScene2.length));
      noteMidi = melodyScene2[(stepIdx + idx) % melodyScene2.length];
      bassMidi = 38 + Math.floor((t - 4.0) * 1.5);
    } else {
      noteMidi = melodyScene3[stepIdx % melodyScene3.length];
      bassMidi = (stepIdx % 8 < 4) ? 48 : 43;
    }

    leadPhase += midiToFreq(noteMidi) / sampleRate;
    bassPhase += midiToFreq(bassMidi) / sampleRate;

    out += square(leadPhase, 0.25) * env * 0.14;
    out += triangle(bassPhase) * 0.16;

    // --- B. BEEP HITUNG MUNDUR 3 - 2 - 1 - GO! ---
    const beepTimes = [
      { start: 0.05, dur: 0.22, freq: 880 },
      { start: 1.12, dur: 0.22, freq: 880 },
      { start: 2.22, dur: 0.22, freq: 880 },
      { start: 3.25, dur: 0.45, freq: 1760 }
    ];
    for (const b of beepTimes) {
      if (t >= b.start && t < b.start + b.dur) {
        const bt = t - b.start;
        out += square(bt * b.freq, 0.5) * Math.exp(-bt * 6.0) * 0.28;
      }
    }

    // --- C. ABA-ABA PERINGATAN STAGE SEPARATION & PENGUNCIAN ORBIT ---
    const alertBeeps = [
      { start: 5.55, dur: 0.12, freq: 1320 },
      { start: 5.75, dur: 0.12, freq: 1320 },
      { start: 6.00, dur: 0.30, freq: 660 },  // Bunyi mekanis pelepasan Stage 1
      { start: 7.80, dur: 0.15, freq: 1568 }, // Beep Orbit Locked 1
      { start: 8.00, dur: 0.30, freq: 2093 }  // Beep Orbit Locked 2
    ];
    for (const a of alertBeeps) {
      if (t >= a.start && t < a.start + a.dur) {
        const at = t - a.start;
        out += square(at * a.freq, 0.5) * Math.exp(-at * 8.0) * 0.24;
      }
    }

    // Synth Riser saat planet mulai terlihat turun (6.2 - 8.0 dtk)
    if (t >= 6.2 && t < 8.0) {
      const prog = (t - 6.2) / 1.8;
      const riserFreq = 220 * Math.pow(2, prog * 2.0);
      out += triangle(t * riserFreq) * prog * 0.12;
    }

    // --- D. GEMURUH ROKET & DESIS ASAP ---
    const white = nextRand();
    if (t < 3.4) {
      out += white * (0.03 + (t / 3.4) * 0.08);
    }

    if (t >= 3.2 && t < 8.2) {
      const rt = t - 3.2;
      const cutoff = t < 6.0 ? 0.09 + (rt / 3.0) * 0.22 : Math.max(0.03, 0.25 - (t - 6.0) * 0.1);
      noiseLP = noiseLP + cutoff * (white - noiseLP);

      let rumbleEnv = 1.0;
      if (t < 3.7) rumbleEnv = (t - 3.2) / 0.5;
      else if (t >= 5.9 && t < 6.1) rumbleEnv = 0.25; // Jeda sesaat saat Stage 1 lepas
      else if (t > 6.8) rumbleEnv = Math.max(0, 1.0 - (t - 6.8) / 1.4);

      const lfo = 0.8 + 0.2 * Math.sin(t * 48.0 * Math.PI * 2);
      const sweepFreq = 55 + Math.pow(Math.max(0, t - 3.5), 1.35) * 36;
      const turbine = Math.sin(2 * Math.PI * sweepFreq * t) * 0.14;

      out += (noiseLP * 1.35 * lfo + turbine) * rumbleEnv * 0.52;
    }

    // --- E. EFEK KETIK TYPEWRITER "MISSION START" (8.30 - 10.25 dtk) ---
    if (t >= 8.30 && t < 10.25) {
      const charRate = 6.8;
      const charPhase = ((t - 8.30) * charRate) % 1.0;
      const charIdx = Math.floor((t - 8.30) * charRate);
      if (charIdx < 13 && charPhase < 0.35) {
        const blipFreq = 1320 + (charIdx % 3) * 220;
        const blipEnv = Math.exp(-charPhase * 18.0);
        out += square(t * blipFreq, 0.5) * blipEnv * 0.25;
      }
    }

    let masterGain = 0.85;
    if (t < 0.15) masterGain *= t / 0.15;
    if (t > 11.5) masterGain *= (12.0 - t) / 0.5;

    samples[i] = Math.max(-1.0, Math.min(1.0, out * masterGain));
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
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(wavPath, buffer);
  console.log(`      Audio berhasil dibuat: ${wavPath}`);
}

// ============================================================================
// 2. RENDER 360 FRAME DENGAN PLAYWRIGHT HEADLESS CHROMIUM
// ============================================================================
async function renderFrames() {
  console.log("[2/3] Merender 360 frame (1080x1920) dengan Playwright Headless Chromium...");
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
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
    await page.evaluate((timeSec) => {
      window.drawFrame(timeSec);
    }, t);

    const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, type: "png" });

    if ((frame + 1) % 60 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres render: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

// ============================================================================
// 3. GABUNGKAN FRAME + AUDIO MENJADI MP4 KOMPATIBEL WINDOWS MEDIA PLAYER
// ============================================================================
function encodeVideoWithFFmpeg() {
  console.log("[3/3] Menggabungkan frame & audio menjadi MP4 dengan FFmpeg...");
  const ffmpegArgs = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.1",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-preset", "medium",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-ac", "2",
    "-b:a", "128k",
    "-shortest",
    OUTPUT_MP4
  ];

  execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  console.log(`\nSelesai! Video MP4 siap di: ${OUTPUT_MP4}`);
}

(async () => {
  try {
    generateProceduralAudio(AUDIO_PATH);
    await renderFrames();
    encodeVideoWithFFmpeg();
  } catch (err) {
    console.error("Terjadi kesalahan saat merender:", err);
    process.exit(1);
  }
})();