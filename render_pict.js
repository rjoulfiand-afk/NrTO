const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 12.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 360 frame
const WIDTH = 1080;
const HEIGHT = 1920;
const NUM_WORKERS = 4;

// Direktori & File Sumber
const PICT_FRAMES_DIR   = path.join(__dirname, "frames_pict");
const GEMINI_FRAMES_DIR = path.join(__dirname, "frames");
const CLAUDE_FRAMES_DIR = path.join(__dirname, "frames_claude");

const GEMINI_HTML_PATH  = path.resolve(__dirname, "animation.html"); // Sumber kode roket Gemini
const PICT_HTML_FILE    = path.resolve(__dirname, "pict.html");
const AUDIO_PATH        = path.join(__dirname, "audio.wav");

const PNG_SENJA = path.join(__dirname, "pict_1_senja.png");
const PNG_LIFT  = path.join(__dirname, "pict_2_lepas_landas.png");
const PNG_ORBIT = path.join(__dirname, "pict_3_orbit.png");

const TEMPLATE_MP4       = path.join(__dirname, "pict_template_capcut.mp4");
const FINAL_SHOWCASE_MP4 = path.join(__dirname, "joulfiand_gemini_vs_claude.mp4");

const GEMINI_MP4 = path.join(__dirname, "rocket_launch_pixelart.mp4");
const CLAUDE_MP4 = path.join(__dirname, "claude_rocket_pixelart.mp4");

// Helper URL file:/// aman untuk Windows, macOS, & Linux
function toFileUrl(absPath, query = "") {
  return "file:///" + path.resolve(absPath).replace(/\\/g, "/") + query;
}

// ============================================================================
// 1. RENDER 3 PNG STATIS + 360 FRAME TEMPLATE PICT.HTML (MULTI-WORKER 4X)
// ============================================================================
async function renderPictAssets() {
  if (!fs.existsSync(PICT_HTML_FILE)) {
    throw new Error(`File pict.html tidak ditemukan di: ${PICT_HTML_FILE}`);
  }

  const htmlUrl = toFileUrl(PICT_HTML_FILE, "?headless=1");
  const forceRender = process.argv.includes("--force-frames");
  const lastFramePath = path.join(PICT_FRAMES_DIR, `frame_${String(TOTAL_FRAMES - 1).padStart(4, "0")}.png`);

  const browser = await chromium.launch({ headless: true });

  // A. Simpan 3 Gambar PNG Statis (Senja, Lepas Landas, Orbit)
  console.log("[1/3] Menyimpan 3 gambar PNG statis (Senja, Lepas Landas, Orbit)...");
  const stillCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const stillPage = await stillCtx.newPage();
  stillPage.on("pageerror", (err) => console.error("[Still Page Error]:", err));
  await stillPage.goto(htmlUrl, { waitUntil: "load" });

  const stills = [
    { t: 2.00,  out: PNG_SENJA, name: "1 · SENJA" },
    { t: 6.00,  out: PNG_LIFT,  name: "2 · LEPAS LANDAS" },
    { t: 11.97, out: PNG_ORBIT, name: "3 · ORBIT" }
  ];
  for (const s of stills) {
    await stillPage.evaluate((timeSec) => window.drawFrame(timeSec), s.t);
    await stillPage.screenshot({ path: s.out, type: "png" });
    console.log(`      ✓ PNG Statis [${s.name}] tersimpan: ${path.basename(s.out)}`);
  }
  await stillCtx.close();

  // B. Render 360 Frame Template secara paralel (skip jika sudah lengkap kecuali --force-frames)
  const existingFrames = fs.existsSync(PICT_FRAMES_DIR)
    ? fs.readdirSync(PICT_FRAMES_DIR).filter((f) => f.endsWith(".png")).length
    : 0;

  if (!forceRender && fs.existsSync(lastFramePath) && existingFrames >= TOTAL_FRAMES) {
    console.log(`[2/3] Seluruh ${TOTAL_FRAMES} frame di frames_pict/ sudah lengkap! (Pakai --force-frames untuk render ulang)`);
  } else {
    console.log(`[2/3] Merender ${TOTAL_FRAMES} frame pict.html (SSAA 2x -> 1080x1920 @ ${FPS} FPS) dengan ${NUM_WORKERS} worker...`);
    if (fs.existsSync(PICT_FRAMES_DIR)) {
      fs.rmSync(PICT_FRAMES_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(PICT_FRAMES_DIR, { recursive: true });

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

        await page.goto(htmlUrl, { waitUntil: "load" });

        for (let frame = fromF; frame < toF; frame++) {
          const t = frame / FPS;
          await page.evaluate((timeSec) => window.drawFrame(timeSec), t);

          const frameFile = path.join(PICT_FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
          await page.screenshot({ path: frameFile, type: "png" });

          completedCount++;
          if (completedCount % 60 === 0 || completedCount === TOTAL_FRAMES) {
            const pct = ((completedCount / TOTAL_FRAMES) * 100).toFixed(0);
            console.log(`      Progres frame template: ${completedCount}/${TOTAL_FRAMES} (${pct}%)`);
          }
        }
        await context.close();
      })(w, startFrame, endFrame));
    }

    await Promise.all(workerTasks);
    console.log(`      ✓ Semua ${TOTAL_FRAMES} frame template selesai dirender!`);
  }

  // C. Opsional: Auto-capture frames/ dari animation.html jika frames/ & rocket_launch_pixelart.mp4 belum ada
  const hasGeminiFrames = fs.existsSync(path.join(GEMINI_FRAMES_DIR, "frame_0000.png"));
  const hasGeminiMp4    = fs.existsSync(GEMINI_MP4);
  if (!hasGeminiFrames && !hasGeminiMp4 && fs.existsSync(GEMINI_HTML_PATH)) {
    console.log("[+] Folder frames/ & MP4 Gemini belum ada — mendeteksi animation.html untuk auto-capture...");
    const testCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const testPage = await testCtx.newPage();
    await testPage.goto(toFileUrl(GEMINI_HTML_PATH, "?headless=1"), { waitUntil: "load" });
    const hasDrawFn = await testPage.evaluate(() => typeof window.drawFrame === "function" || typeof window.renderFrame === "function");

    if (hasDrawFn) {
      fs.mkdirSync(GEMINI_FRAMES_DIR, { recursive: true });
      for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const t = frame / FPS;
        await testPage.evaluate((timeSec) => {
          if (typeof window.drawFrame === "function") window.drawFrame(timeSec);
          else if (typeof window.renderFrame === "function") window.renderFrame(timeSec);
        }, t);
        await testPage.screenshot({
          path: path.join(GEMINI_FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`),
          type: "png"
        });
        if ((frame + 1) % 90 === 0 || frame === TOTAL_FRAMES - 1) {
          console.log(`      Auto-capture animation.html: ${frame + 1}/${TOTAL_FRAMES}`);
        }
      }
      console.log("      ✓ Frame roket Gemini dari animation.html siap!");
    } else {
      console.log("      ! animation.html tidak mengekspor window.drawFrame(t) — lewati auto-capture.");
    }
    await testCtx.close();
  }

  await browser.close();
}

// ============================================================================
// 2. ENCODE TEMPLATE CAPCUT & VIDEO SHOWCASE LOSSLESS (CRF 12 ULTRA-TAJAM)
// ============================================================================
function encodeVideos() {
  console.log("[3/3] Mengenkode video template & showcase ketajaman tinggi (CRF 12)...");

  // A. Video Template Kosong untuk CapCut (Tanpa Audio)
  const templateArgs = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(PICT_FRAMES_DIR, "frame_%04d.png"),
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.1",
    "-pix_fmt", "yuv420p",
    "-crf", "12",
    "-preset", "medium",
    "-an",
    "-movflags", "+faststart",
    TEMPLATE_MP4
  ];
  execFileSync("ffmpeg", templateArgs, { stdio: "inherit" });
  console.log(`      ✓ Template CapCut siap di: ${TEMPLATE_MP4}`);

  // B. Video Gabungan Lengkap (Prioritas PNG Lossless -> Fallback MP4)
  const hasGeminiPng = fs.existsSync(path.join(GEMINI_FRAMES_DIR, "frame_0000.png"));
  const hasClaudePng = fs.existsSync(path.join(CLAUDE_FRAMES_DIR, "frame_0000.png"));

  const inputGemini = hasGeminiPng
    ? ["-framerate", String(FPS), "-i", path.join(GEMINI_FRAMES_DIR, "frame_%04d.png")]
    : (fs.existsSync(GEMINI_MP4) ? ["-i", GEMINI_MP4] : null);

  const inputClaude = hasClaudePng
    ? ["-framerate", String(FPS), "-i", path.join(CLAUDE_FRAMES_DIR, "frame_%04d.png")]
    : (fs.existsSync(CLAUDE_MP4) ? ["-i", CLAUDE_MP4] : null);

  if (inputGemini && inputClaude) {
    const hasAudioWav = fs.existsSync(AUDIO_PATH);
    console.log(
      `      Menyusun video showcase (Gemini: ${hasGeminiPng ? "PNG Lossless" : "MP4"} | Claude: ${hasClaudePng ? "PNG Lossless" : "MP4"})...`
    );

    const compositeArgs = [
      "-y",
      "-framerate", String(FPS),
      "-i", path.join(PICT_FRAMES_DIR, "frame_%04d.png"),
      ...inputGemini,
      ...inputClaude,
      ...(hasAudioWav ? ["-i", AUDIO_PATH] : []),
      "-filter_complex",
      // Filter area + accurate_rnd menjaga ketajaman piksel dan teks HUD tanpa pecah
      "[1:v]scale=468:832:flags=area+accurate_rnd+full_chroma_int[gem];" +
      "[2:v]scale=468:832:flags=area+accurate_rnd+full_chroma_int[cla];" +
      "[0:v][gem]overlay=48:464:format=auto[bg1];" +
      "[bg1][cla]overlay=564:464:format=auto,format=yuv420p,setsar=1[v]",
      "-map", "[v]",
      ...(hasAudioWav ? ["-map", "3:a"] : ["-map", "1:a?"]),
      "-c:v", "libx264",
      "-profile:v", "high",
      "-level:v", "4.1",
      "-crf", "12",
      "-preset", "medium",
      "-c:a", "aac",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      FINAL_SHOWCASE_MP4
    ];

    execFileSync("ffmpeg", compositeArgs, { stdio: "inherit" });
    console.log(`\nSUKSES! Video Showcase Page 3 Ultra-Tajam siap di: ${FINAL_SHOWCASE_MP4}`);
  } else {
    console.log("\nCatatan: Folder frames/ & frames_claude/ (atau MP4 masing-masing) belum lengkap — hanya template CapCut yang dibuat.");
  }
}

(async () => {
  const startTime = Date.now();
  try {
    await renderPictAssets();
    encodeVideos();
    console.log(`Total waktu proses: ${((Date.now() - startTime) / 1000).toFixed(1)} detik`);
  } catch (err) {
    console.error("Terjadi kesalahan saat rendering Page 3 (pict):", err);
    process.exit(1);
  }
})();