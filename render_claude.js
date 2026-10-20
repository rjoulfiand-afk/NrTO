const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 12;
const TOTAL_FRAMES = FPS * DURATION; // 360 frame
const WIDTH = 1080;
const HEIGHT = 1920;

const FRAMES_DIR = path.join(__dirname, "frames_claude");
const AUDIO_PATH = path.join(__dirname, "audio.wav");
const FIRST_MP4 = path.join(__dirname, "rocket_launch_pixelart.mp4");
const CLAUDE_MP4 = path.join(__dirname, "claude_rocket_pixelart.mp4");
const COMPARE_MP4 = path.join(__dirname, "perbandingan_roket.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "claude.html") + "?headless=1";

async function renderClaudeFrames() {
  console.log("[1/3] Merender 360 frame dari claude.html dengan Playwright...");
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
      console.log(`      Progres render claude.html: ${frame + 1}/${TOTAL_FRAMES} frame (t = ${t.toFixed(2)} dtk)`);
    }
  }

  await browser.close();
}

function encodeClaudeVideo() {
  console.log("[2/3] Menggabungkan frame claude.html + audio.wav menjadi MP4...");
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
    CLAUDE_MP4
  ];

  execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  console.log(`      Video Claude siap di: ${CLAUDE_MP4}`);
}

function buildSideBySideComparison() {
  if (!fs.existsSync(FIRST_MP4)) {
    console.log("[3/3] File rocket_launch_pixelart.mp4 belum ditemukan, melewati pembuatan video side-by-side.");
    return;
  }
  console.log("[3/3] Membuat video perbandingan berdampingan (Kiri: Versi 1 vs Kanan: Versi Claude Upgraded)...");
  const compareArgs = [
    "-y",
    "-i", FIRST_MP4,
    "-i", CLAUDE_MP4,
    "-filter_complex", "[0:v]scale=540:960:flags=neighbor[v0];[1:v]scale=540:960:flags=neighbor[v1];[v0][v1]hstack=inputs=2[v]",
    "-map", "[v]",
    "-map", "0:a",
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.1",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-preset", "medium",
    "-movflags", "+faststart",
    "-c:a", "copy",
    COMPARE_MP4
  ];

  execFileSync("ffmpeg", compareArgs, { stdio: "inherit" });
  console.log(`\nMantap! Video perbandingan siap di: ${COMPARE_MP4}`);
}

(async () => {
  try {
    if (!fs.existsSync(AUDIO_PATH)) {
      throw new Error("File audio.wav belum ada! Pastikan audio.wav masih ada di folder ini.");
    }
    await renderClaudeFrames();
    encodeClaudeVideo();
    buildSideBySideComparison();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();