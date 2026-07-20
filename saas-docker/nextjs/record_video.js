const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

async function smoothScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 10;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // Para de scrollar quando chega no final ou após 4000 pixels (para o vídeo não ficar gigante)
        if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 4000) {
          clearInterval(timer);
          resolve();
        }
      }, 30); // 30ms para um scroll bem suave (aprox 33fps para o movimento)
    });
  });
}

async function run() {
  const artifactDir = "C:\\Users\\Ruan Gomes\\.gemini\\antigravity\\brain\\596fdc2f-9c57-4e14-a34d-06b067129f5e";
  const outputDir = path.join(artifactDir, 'scratch');
  const videoPath = path.join(outputDir, 'demo_smooth.mp4');

  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  const config = {
    followNewTab: false,
    fps: 60,
    videoFrame: {
      width: 1920,
      height: 1080,
    },
    videoCrf: 18,
    videoCodec: 'libx264',
    videoPreset: 'ultrafast',
  };
  
  const recorder = new PuppeteerScreenRecorder(page, config);
  
  console.log("Acessando a Home...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Dar mais tempo para as imagens e fontes carregarem (evita o borrado inicial)
  await new Promise(r => setTimeout(r, 4000));
  
  await recorder.start(videoPath);
  console.log("Gravando Home...");
  
  // Parado no topo por 3 segundos
  await new Promise(r => setTimeout(r, 3000));
  
  // Scroll super suave até lá embaixo
  await smoothScroll(page);
  
  console.log("Acessando Landing Page...");
  await page.goto('http://localhost:3000/templates/landing-page', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000)); // Aguarda carregar as imagens novas antes de scrollar
  
  console.log("Gravando Landing Page...");
  await smoothScroll(page);
  
  await new Promise(r => setTimeout(r, 2000));
  
  await recorder.stop();
  await browser.close();
  
  console.log("Vídeo salvo em:", videoPath);
}

run().catch(console.error);
