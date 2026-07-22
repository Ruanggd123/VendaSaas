const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

async function smoothScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 15;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 2500) {
          clearInterval(timer);
          resolve();
        }
      }, 30);
    });
  });
}

async function run() {
  const artifactDir = "C:\\Users\\Ruan Gomes\\.gemini\\antigravity\\brain\\7af57649-055f-4fe8-b4bd-231019620c41";
  const outputDir = path.join(artifactDir, 'scratch');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const videoPath = path.join(outputDir, 'dashboard_tour.mp4');

  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  const config = {
    followNewTab: false,
    fps: 30,
    videoFrame: { width: 1440, height: 900 },
    videoCrf: 22,
    videoCodec: 'libx264',
    videoPreset: 'ultrafast',
  };
  
  const recorder = new PuppeteerScreenRecorder(page, config);
  
  console.log("Fazendo login via rota de teste...");
  await page.goto('http://localhost:3000/api/test-login', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000)); // Aguarda carregar dashboard inicial
  
  await recorder.start(videoPath);
  console.log("Gravando Dashboard Home...");
  
  // Parado no topo
  await new Promise(r => setTimeout(r, 2000));
  await smoothScroll(page);
  
  console.log("Acessando Assinaturas (Meu Plano)...");
  // Encontrar o link "Meu Plano"
  const links = await page.$$('a');
  let clicked = false;
  for (let link of links) {
    const text = await page.evaluate(el => el.textContent, link);
    if (text.includes("Meu Plano")) {
      await link.click();
      clicked = true;
      break;
    }
  }

  if(!clicked) {
     // Fallback to direct navigation if link not found
     const currentUrl = page.url(); // e.g. http://localhost:3000/tenant/uuid
     await page.goto(`${currentUrl}/assinatura`, { waitUntil: 'networkidle0' });
  } else {
     await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }
  
  await new Promise(r => setTimeout(r, 2000));
  console.log("Gravando Assinaturas...");
  await smoothScroll(page);
  await new Promise(r => setTimeout(r, 1000));

  console.log("Acessando Configurações de IA...");
  // Vamos voltar para home e ir para IA config (ou ir direto pela URL atual)
  const tenantUrlMatch = page.url().match(/(.*\/tenant\/[^/]+)/);
  if(tenantUrlMatch) {
     await page.goto(`${tenantUrlMatch[1]}/ai-config`, { waitUntil: 'networkidle0' });
     await new Promise(r => setTimeout(r, 2000));
     console.log("Gravando IA...");
     await smoothScroll(page);
     await new Promise(r => setTimeout(r, 1000));
  }

  await recorder.stop();
  await browser.close();
  
  console.log("Vídeo salvo em:", videoPath);
}

run().catch(console.error);
