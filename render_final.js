const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const os = require("os");

const FPS = 30;
const DURATION = 198.00; // Master Final 6-Part (198.00 Detik · 5940 Frame @ 30 FPS)
const TOTAL_FRAMES = Math.round(FPS * DURATION);
const WIDTH = 1080;
const HEIGHT = 1920;

// Set default worker sesuai jumlah core CPU (Celeron dual-core = 2 workers)
const DEFAULT_WORKERS = Math.min(2, Math.max(1, os.cpus().length));
const NUM_WORKERS = process.argv.includes("--workers") 
  ? parseInt(process.argv[process.argv.indexOf("--workers") + 1], 10) || DEFAULT_WORKERS
  : DEFAULT_WORKERS;

const FRAMES_DIR = path.join(__dirname, "frames_final");
const AUDIO_PATH = path.join(__dirname, "audio_final.wav");
const OUTPUT_MP4 = path.join(__dirname, "final_joulfiand.mp4");

function resolveHtmlPath() {
  const full = path.resolve(__dirname, "final.html");
  if (fs.existsSync(full)) {
    console.log(`      ✓ Sumber HTML ditemukan: final.html`);
    return "file:///" + full.replace(/\\/g, "/") + "?headless=1";
  }
  throw new Error("File final.html tidak ditemukan di folder ini.");
}

// ============================================================================
// 1. STITCH / SINTESIS AUDIO MASTER (198.00 DETIK · 6 PART LENGKAP)
// ============================================================================
function generateMasterFinalAudio(wavPath) {
  console.log(`[1/3] Memeriksa & menggabungkan 6 audio part menjadi Master Audio (${DURATION.toFixed(2)}s)...`);
  const parts = [
    { file: "audio_intro.wav", expectedDur: 46.00, name: "00 · Intro" },
    { file: "audio_page1.wav", expectedDur: 26.00, name: "01 · Soal & Prompt" },
    { file: "audio_page2.wav", expectedDur: 32.00, name: "02 · Proses & Audit" },
    { file: "audio.wav",       expectedDur: 12.00, name: "03 · Hasil Roket" },
    { file: "audio_page4.wav", expectedDur: 54.00, name: "04 · Arto Review" },
    { file: "audio_page5.wav", expectedDur: 28.00, name: "05 · Finale & Outro" }
  ];

  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * DURATION);
  const masterSamples = new Float32Array(totalSamples);

  let currentSampleIdx = 0;

  for (let pIdx = 0; pIdx < parts.length; pIdx++) {
    const p = parts[pIdx];
    const fullPath = path.resolve(__dirname, p.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`      ! File ${p.file} tidak ditemukan, mengisi silence...`);
      currentSampleIdx += Math.floor(p.expectedDur * sampleRate);
      continue;
    }
    const buf = fs.readFileSync(fullPath);
    const sr = buf.readUInt32LE(24);
    const ch = buf.readUInt16LE(22);
    const bits = buf.readUInt16LE(34);
    const dataSize = buf.readUInt32LE(40);
    const numSamples = dataSize / (ch * (bits / 8));

    console.log(`      [${pIdx + 1}/6] ${p.name} (${p.file}): ${(numSamples / sr).toFixed(2)}s`);

    const samplesToCopy = Math.min(numSamples, Math.floor(p.expectedDur * sampleRate));
    for (let i = 0; i < samplesToCopy; i++) {
      if (currentSampleIdx + i >= totalSamples) break;
      const raw = buf.readInt16LE(44 + i * (bits / 8) * ch);
      masterSamples[currentSampleIdx + i] = raw / 32768.0;
    }
    currentSampleIdx += Math.floor(p.expectedDur * sampleRate);
  }

  // Soft-knee limiter & micro-fade in/out
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = masterSamples[i];
    if (t < 0.05) s *= t / 0.05;
    if (t > DURATION - 0.15) s *= (DURATION - t) / 0.15;
    s = Math.tanh(s * 1.02) * 0.94;
    masterSamples[i] = s;
    if (Math.abs(s) > peak) peak = Math.abs(s);
  }

  const dataByteSize = totalSamples * 2;
  const wavBuf = Buffer.alloc(44 + dataByteSize);
  wavBuf.write("RIFF", 0);
  wavBuf.writeUInt32LE(36 + dataByteSize, 4);
  wavBuf.write("WAVE", 8);
  wavBuf.write("fmt ", 12);
  wavBuf.writeUInt32LE(16, 16);
  wavBuf.writeUInt16LE(1, 20); // PCM
  wavBuf.writeUInt16LE(1, 22); // Mono
  wavBuf.writeUInt32LE(sampleRate, 24);
  wavBuf.writeUInt32LE(sampleRate * 2, 28);
  wavBuf.writeUInt16LE(2, 32); // BlockAlign
  wavBuf.writeUInt16LE(16, 34); // BitsPerSample
  wavBuf.write("data", 36);
  wavBuf.writeUInt32LE(dataByteSize, 40);

  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.floor(masterSamples[i] * 32767)));
    wavBuf.writeInt16LE(s, 44 + i * 2);
  }

  fs.writeFileSync(wavPath, wavBuf);
  console.log(`      ✓ Master Audio siap: ${wavPath} (${(wavBuf.length / 1024 / 1024).toFixed(2)} MB, Peak: ${(peak * 100).toFixed(1)}%)`);
}

// ============================================================================
// 2. METODE SMART COMPOSE: PAKAI FRAME CACHE PART + BLEND TRANSISI (SUPER CEPAT)
// ============================================================================
async function trySmartComposeFrames(htmlPath) {
  const partDirs = [
    { dir: "frames_intro", count: 1380, startFrame: 0, dur: 46.00 },
    { dir: "frames_page1", count: 780,  startFrame: 1380, dur: 26.00 },
    { dir: "frames_page2", count: 960,  startFrame: 2160, dur: 32.00 },
    { dir: "frames_pict",  count: 360,  startFrame: 3120, dur: 12.00 },
    { dir: "frames_page4", count: 1620, startFrame: 3480, dur: 54.00 },
    { dir: "frames_page5", count: 840,  startFrame: 5100, dur: 28.00 }
  ];

  // Periksa ketersediaan seluruh cache part
  let allCached = true;
  for (const p of partDirs) {
    const pPath = path.join(__dirname, p.dir);
    if (!fs.existsSync(pPath)) { allCached = false; break; }
    const actual = fs.readdirSync(pPath).filter(f => f.endsWith(".png")).length;
    if (actual < p.count) { allCached = false; break; }
  }

  if (!allCached) {
    console.log("      ! Sebagian cache part belum lengkap, beralih ke direct Playwright render...");
    return false;
  }

  console.log(`[2/3] Mode Smart Compose aktif: Menggabungkan cache 6 part & merender transisi optik...`);
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // 1. Salin frame isi part non-transisi
  const TRANS_FRAMES = 15; // 0.5 detik (15 frame @ 30 FPS)
  const halfTrans = Math.floor(TRANS_FRAMES / 2); // 7 frame sebelum & sesudah batas

  const transitionFrames = new Set();
  const boundaries = [1380, 2160, 3120, 3480, 5100];
  boundaries.forEach(b => {
    for (let f = b - halfTrans; f <= b + halfTrans; f++) {
      if (f >= 0 && f < TOTAL_FRAMES) transitionFrames.add(f);
    }
  });

  console.log(`      • Menyalin frame solid dari folder part (melewati ${transitionFrames.size} frame transisi)...`);
  for (const p of partDirs) {
    const srcDir = path.join(__dirname, p.dir);
    for (let i = 0; i < p.count; i++) {
      const globalFrame = p.startFrame + i;
      if (transitionFrames.has(globalFrame)) continue; // akan dirender khusus via final.html

      const srcFile = path.join(srcDir, `frame_${String(i).padStart(4, "0")}.png`);
      const destFile = path.join(FRAMES_DIR, `frame_${String(globalFrame).padStart(4, "0")}.png`);
      if (fs.existsSync(srcFile)) {
        const srcStat = fs.statSync(srcFile);
        const needCopy = !fs.existsSync(destFile) || 
                         fs.statSync(destFile).size < 1000 || 
                         srcStat.mtimeMs > fs.statSync(destFile).mtimeMs;
        if (needCopy) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  }

  // 2. Render khusus titik transisi yang mulus via final.html
  console.log(`      • Merender ${transitionFrames.size} frame transisi optik mulus via final.html...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(htmlPath, { waitUntil: "load" });
  await page.waitForTimeout(300);

  const transList = Array.from(transitionFrames).sort((a, b) => a - b);
  for (let idx = 0; idx < transList.length; idx++) {
    const frame = transList[idx];
    const t = frame / FPS;
    await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

    const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, type: "png", timeout: 0, animations: "disabled" });

    if ((idx + 1) % 15 === 0 || idx === transList.length - 1) {
      console.log(`        Transisi: ${idx + 1}/${transList.length} frame selesai dirender`);
    }
  }

  await browser.close();
  const totalOnDisk = fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith(".png")).length;
  console.log(`      ✓ Smart Compose selesai: ${totalOnDisk}/${TOTAL_FRAMES} frame siap di ${FRAMES_DIR}!`);
  return totalOnDisk >= TOTAL_FRAMES;
}

// ============================================================================
// 3. RENDER RESUME PLAYWRIGHT (ZERO TIMEOUT · DUAL CORE OPTIMIZED)
// ============================================================================
async function renderFinalFramesDirect(htmlPath) {
  const lastFramePath = path.join(FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const existingFiles = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png"));
  if (existingFiles.length >= TOTAL_FRAMES && fs.existsSync(lastFramePath)) {
    console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_final/ sudah lengkap!`);
    return;
  }

  console.log(`[2/3] Merender frame via Playwright (${NUM_WORKERS} worker, timeout: 0, resume support)...`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ]
  });

  const framesPerWorker = Math.ceil(TOTAL_FRAMES / NUM_WORKERS);
  const workerTasks = [];
  let completedCount = existingFiles.length;

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
      await page.waitForTimeout(300);

      for (let frame = fromF; frame < toF; frame++) {
        const frameFile = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
        if (fs.existsSync(frameFile) && fs.statSync(frameFile).size > 1000) {
          continue; // Lewati jika sudah ada (Resume)
        }

        const t = frame / FPS;
        await page.evaluate((timeSec) => window.drawFrame(timeSec), t);
        await page.screenshot({ path: frameFile, type: "png", timeout: 0, animations: "disabled" });

        completedCount++;
        if (completedCount % 50 === 0 || completedCount >= TOTAL_FRAMES) {
          const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(1);
          console.log(`      Progres render Master Final: ${completedCount}/${TOTAL_FRAMES} frame (${pct}%)`);
        }
      }

      await context.close();
    })(w, startFrame, endFrame));
  }

  await Promise.all(workerTasks);
  await browser.close();
  console.log(`      ✓ Semua ${TOTAL_FRAMES} frame Master Final selesai dirender!`);
}

// ============================================================================
// 4. ENCODE KE final_joulfiand.mp4 DENGAN FFMPEG (CRF 14 ULTRA-TAJAM FULL HD)
// ============================================================================
function encodeFinalVideo() {
  console.log("[3/3] Menggabungkan 5940 frame & master audio menjadi final_joulfiand.mp4 dengan FFmpeg...");
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
  console.log(`\n===========================================================================`);
  console.log(`SUKSES TOTAL! Video Master 6-Part selesai di: ${OUTPUT_MP4}`);
  console.log(`Ukuran File: ${(fs.statSync(OUTPUT_MP4).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Resolusi: 1080x1920 Full HD · Durasi: ${DURATION.toFixed(2)}s · FPS: ${FPS}`);
  console.log(`===========================================================================\n`);
}

(async () => {
  const startTime = Date.now();
  try {
    generateMasterFinalAudio(AUDIO_PATH);

    if (!process.argv.includes("--audio-only")) {
      const htmlPath = resolveHtmlPath();
      const forceDirect = process.argv.includes("--force-direct");

      let composed = false;
      if (!forceDirect) {
        composed = await trySmartComposeFrames(htmlPath);
      }
      if (!composed) {
        await renderFinalFramesDirect(htmlPath);
      }

      encodeFinalVideo();
    }
    console.log(`Total waktu eksekusi: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Master Final:", err);
    process.exit(1);
  }
})();
