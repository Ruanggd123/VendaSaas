const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const puppeteer = require("puppeteer");
const { EdgeTTS } = require("node-edge-tts");

const DEFAULTS = {
  baseUrl: "http://localhost:3000",
  fps: 4,
  outputDir: path.join(process.cwd(), "artifacts", "platform-tutorial"),
  narrativePath: path.join(process.cwd(), "scripts", "platform_tutorial_narrative.txt"),
  audioOutput: path.join(process.cwd(), "artifacts", "platform-tutorial", "narrativa-plataforma.mp3"),
  rawVideo: path.join(process.cwd(), "artifacts", "platform-tutorial", "video_tutorial_raw.mp4"),
  finalVideo: path.join(process.cwd(), "artifacts", "platform-tutorial", "video_tutorial_com_audio.mp4"),
  voice: "pt-BR-FranciscaNeural",
  lang: "pt-BR",
};

function parseArgs() {
  const args = {};
  const input = process.argv.slice(2);

  for (let i = 0; i < input.length; i += 1) {
    const token = input[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = input[i + 1];

    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
      continue;
    }

    args[key] = true;
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickButtonByText(page, searchText) {
  const target = String(searchText || "").trim().toLowerCase();
  if (!target) return false;

  const buttons = await page.$$("button");

  for (const btn of buttons) {
    const text = await page.evaluate((el) => (el.textContent || "").trim().toLowerCase(), btn);
    if (text.includes(target)) {
      await btn.click();
      return true;
    }
  }

  return false;
}

async function writeFramesFromScenario(page, framesDir, state) {
  const captureHold = async (action, holdMs = 1200) => {
    if (action) {
      await action();
    }

    const totalFrames = Math.max(1, Math.ceil(holdMs / state.frameDelay));

    for (let i = 0; i < totalFrames; i += 1) {
      await page.screenshot({
        path: path.join(framesDir, `frame_${String(state.index).padStart(4, "0")}.png`),
        fullPage: true,
      });
      state.index += 1;

      if (i + 1 < totalFrames) {
        await sleep(state.frameDelay);
      }
    }
  };

  await captureHold(undefined, 1200);

  await captureHold(async () => {
    await page.goto(`${state.baseUrl}/api/test-login`, { waitUntil: "networkidle0" });
  }, 1600);

  const afterLogin = page.url().toLowerCase();
  if (afterLogin.includes("/login")) {
    await captureHold(async () => {
      const email = process.env.TUTORIAL_EMAIL || process.env.DEMO_EMAIL || "";
      const password = process.env.TUTORIAL_PASSWORD || process.env.DEMO_PASSWORD || "";

      if (!email || !password) {
        throw new Error(
          "Autenticação automática falhou: defina TUTORIAL_EMAIL e TUTORIAL_PASSWORD para login manual, ou garanta um usuário válido na rota /api/test-login."
        );
      }

      await page.goto(`${state.baseUrl}/login`, { waitUntil: "networkidle0" });
      await page.type("#email", email, { delay: 30 });
      await page.type("#password", password, { delay: 30 });
      await page.click("button[type='submit']");
      await page.waitForNavigation({ waitUntil: "networkidle0" });
    }, 1800);
  }

  await captureHold(async () => {
    await page.goto(`${state.baseUrl}/workflow`, { waitUntil: "networkidle0" });
  }, 1800);

  await captureHold(async () => {
    const clicked = await clickButtonByText(page, "fluxo visual");
    if (!clicked) {
      await clickButtonByText(page, "simulador");
    }
  }, 1800);

  await captureHold(async () => {
    const clicked = await clickButtonByText(page, "simulador");
    if (!clicked) {
      await clickButtonByText(page, "testar no simulador ao vivo");
    }
  }, 1600);

  await captureHold(async () => {
    const selector = 'input[placeholder="Digite uma opção ou mensagem..."]';
    await page.waitForSelector(selector, { timeout: 12000 });
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, "1", { delay: 100 });
    await page.keyboard.press("Enter");
  }, 1800);

  await captureHold(async () => {
    const selector = 'input[placeholder="Digite uma opção ou mensagem..."]';
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, "2", { delay: 100 });
    await page.keyboard.press("Enter");
  }, 1800);

  // Pequena pausa final para fechar a gravação com tela estável.
  await captureHold(undefined, 2000);
}

function runAudioGeneration(narrativePath, audioOutput, voice, lang) {
  const cleanText = fs.readFileSync(narrativePath, "utf8").trim();
  if (!cleanText) {
    throw new Error(`Arquivo de narrativa vazio: ${narrativePath}`);
  }

  const tts = new EdgeTTS({
    voice,
    lang,
  });

  return tts.ttsPromise(cleanText, audioOutput);
}

function runVideoMerge(rawVideo, audioFile, finalVideo) {
  const command = `ffmpeg -y -i "${rawVideo}" -i "${audioFile}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${finalVideo}"`;
  execSync(command, { stdio: "inherit" });
}

async function runRecording(baseUrl, outputDir, fps, rawVideoPath) {
  const framesDir = path.join(outputDir, "frames");
  const rawVideo = rawVideoPath || path.join(outputDir, "video_tutorial_raw.mp4");

  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }

  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1536, height: 960 },
  });

  try {
    const page = await browser.newPage();
    const state = {
      baseUrl,
      index: 0,
      frameDelay: Math.max(80, Math.round(1000 / fps)),
    };

    await writeFramesFromScenario(page, framesDir, state);

    const framePattern = path.join(framesDir, "frame_%04d.png");
    const ffmpegCommand = `ffmpeg -y -framerate ${fps} -i "${framePattern}" -vf "fps=${fps},format=yuv420p" -c:v libx264 -pix_fmt yuv420p "${rawVideo}"`;

    execSync(ffmpegCommand, { stdio: "inherit" });

    return { rawVideo, frameCount: state.index };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs();

  const baseUrl = String(args["base-url"] || DEFAULTS.baseUrl);
  const fps = Number(args.fps || DEFAULTS.fps);
  const rawVideo = path.resolve(args["video-raw"] || DEFAULTS.rawVideo);
  const finalVideo = path.resolve(args["video-final"] || DEFAULTS.finalVideo);
  const outputDir = path.resolve(
    args.output || path.dirname(rawVideo)
  );
  const narrativePath = path.resolve(args.narrative || DEFAULTS.narrativePath);
  const audioOutput = path.resolve(args["audio-output"] || DEFAULTS.audioOutput);
  const voice = String(args.voice || DEFAULTS.voice);
  const lang = String(args.lang || DEFAULTS.lang);
  const skipVideo = Boolean(args["skip-video"]);
  const skipAudio = Boolean(args["skip-audio"]);
  const skipMerge = Boolean(args["skip-merge"]);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.dirname(rawVideo), { recursive: true });
  fs.mkdirSync(path.dirname(finalVideo), { recursive: true });
  fs.mkdirSync(path.dirname(audioOutput), { recursive: true });

  let generatedAudio = false;
  if (!skipAudio) {
    console.log("Gerando áudio a partir da narrativa...");
    await runAudioGeneration(narrativePath, audioOutput, voice, lang);
    generatedAudio = true;
    console.log("Áudio pronto:", audioOutput);
  }

  let generatedVideo = false;
  let generatedRawVideo = "";
  if (!skipVideo) {
    console.log("Gravando demo em frames e renderizando vídeo ...");
    const recording = await runRecording(baseUrl, outputDir, fps, rawVideo);
    generatedRawVideo = recording.rawVideo;
    generatedVideo = true;
    console.log("Vídeo renderizado:", generatedRawVideo, "(", recording.frameCount, "frames )");
  }

  if (generatedVideo && generatedAudio && !skipMerge) {
    console.log("Mesclando vídeo + áudio...");
    runVideoMerge(rawVideo, audioOutput, finalVideo);
    console.log("Vídeo final gerado:", finalVideo);
  }

  if (!generatedVideo && !generatedAudio) {
    console.log("Nenhum arquivo foi gerado. Verifique as flags usadas.");
    return;
  }

  console.log("Tudo pronto.");
  console.log("Diretório:", outputDir);
  if (generatedVideo) {
    console.log("Passo de vídeo:", generatedRawVideo || rawVideo);
  }
  if (generatedAudio) {
    console.log("Passo de áudio:", audioOutput);
  }
}

main().catch((error) => {
  console.error("Erro ao gerar mídia do tutorial:", error);
  process.exit(1);
});
