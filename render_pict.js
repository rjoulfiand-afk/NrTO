const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 12;
const TOTAL_FRAMES = FPS * DURATION; // 360 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const PICT_FRAMES_DIR = path.join(__dirname, "frames_pict");
const GEMINI_FRAMES_DIR = path.join(__dirname, "frames");
const CLAUDE_FRAMES_DIR = path.join(__dirname, "frames_claude");
const AUDIO_PATH = path.join(__dirname, "audio.wav");

const HTML_PATH = "file://" + path.join(__dirname, "pict.html") + "?headless=1";

const PNG_SENJA = path.join(__dirname, "pict_1_senja.png");
const PNG_LIFT  = path.join(__dirname, "pict_2_lepas_landas.png");
const PNG_ORBIT = path.join(__dirname, "pict_3_orbit.png");

const TEMPLATE_MP4 = path.join(__dirname, "pict_template_capcut.mp4");
const FINAL_SHOWCASE_MP4 = path.join(__dirname, "joulfiand_gemini_vs_claude.mp4");

const GEMINI_MP4 = path.join(__dirname, "rocket_launch_pixelart.mp4");
const CLAUDE_MP4 = path.join(__dirname, "claude_rocket_pixelart.mp4");

async function renderPictAssets() {
  console.log("[1/3] Merender pict.html (Supersampled 4K -> 1080x1920) dengan Playwright...");
  if (!fs.existsSync(PICT_FRAMES_DIR)) {
    fs.mkdirSync(PICT_FRAMES_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(HTML_PATH, { waitUntil: "load" });

  // 1. Simpan 3 Gambar PNG Statis (Senja, Lepas Landas, Orbit)
  const stills = [
    { t: 2.00,  out: PNG_SENJA, name: "1 · SENJA" },
    { t: 6.00,  out: PNG_LIFT,  name: "2 · LEPAS LANDAS" },
    { t: 11.97, out: PNG_ORBIT, name: "3 · ORBIT" }
  ];

  for (const s of stills) {
    await page.evaluate((timeSec) => window.drawFrame(timeSec), s.t);
    await page.screenshot({ path: s.out, type: "png" });
    console.log(`      PNG Statis [${s.name}] tersimpan: ${s.out}`);
  }

  // 2. Render 360 Frame Template
  console.log("[2/3] Merender 360 frame template timeline...");
  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;
    await page.evaluate((timeSec) => window.drawFrame(timeSec), t);
    const frameFile = path.join(PICT_FRAMES_DIR, `frame_${String(frame).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, type: "png" });

    if ((frame + 1) % 90 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(`      Progres frame template: ${frame + 1}/${TOTAL_FRAMES}`);
    }
  }

  await browser.close();
}

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
  console.log(`      Template CapCut siap di: ${TEMPLATE_MP4}`);

  // B. Video Gabungan Lengkap (Langsung dari PNG Lossless jika folder frames tersedia!)
  const hasGeminiPng = fs.existsSync(path.join(GEMINI_FRAMES_DIR, "frame_0000.png"));
  const hasClaudePng = fs.existsSync(path.join(CLAUDE_FRAMES_DIR, "frame_0000.png"));

  const inputGemini = hasGeminiPng
    ? ["-framerate", String(FPS), "-i", path.join(GEMINI_FRAMES_DIR, "frame_%04d.png")]
    : (fs.existsSync(GEMINI_MP4) ? ["-i", GEMINI_MP4] : null);

  const inputClaude = hasClaudePng
    ? ["-framerate", String(FPS), "-i", path.join(CLAUDE_FRAMES_DIR, "frame_%04d.png")]
    : (fs.existsSync(CLAUDE_MP4) ? ["-i", CLAUDE_MP4] : null);

  if (inputGemini && inputClaude) {
    console.log("      Menyusun video showcase langsung dari sumber Lossless (Zero Double-Compression)...");

    const compositeArgs = [
      "-y",
      "-framerate", String(FPS),
      "-i", path.join(PICT_FRAMES_DIR, "frame_%04d.png"),
      ...inputGemini,
      ...inputClaude,
      ...(fs.existsSync(AUDIO_PATH) ? ["-i", AUDIO_PATH] : []),
      "-filter_complex",
      // Filter area + accurate_rnd menjaga ketajaman piksel dan teks HUD tanpa pecah
      "[1:v]scale=468:832:flags=area+accurate_rnd+full_chroma_int[gem];" +
      "[2:v]scale=468:832:flags=area+accurate_rnd+full_chroma_int[cla];" +
      "[0:v][gem]overlay=48:464:format=auto[bg1];" +
      "[bg1][cla]overlay=564:464:format=auto,format=yuv420p,setsar=1[v]",
      "-map", "[v]",
      ...(fs.existsSync(AUDIO_PATH) ? ["-map", "3:a"] : ["-map", "1:a?"]),
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
    console.log(`\nMantap! Video Showcase Ultra-Tajam siap di: ${FINAL_SHOWCASE_MP4}`);
  }
}

(async () => {
  try {
    await renderPictAssets();
    encodeVideos();
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    process.exit(1);
  }
})();