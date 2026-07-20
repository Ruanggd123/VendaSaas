const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const artifactDir = "C:\\Users\\Ruan Gomes\\.gemini\\antigravity\\brain\\596fdc2f-9c57-4e14-a34d-06b067129f5e";
  const outputDir = path.join(artifactDir, 'scratch');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  console.log("Acessando a Home...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  const homePath = path.join(outputDir, 'home.png');
  await page.screenshot({ path: homePath, fullPage: true });
  console.log("Screenshot Home salvo em:", homePath);
  
  // Vamos tentar acessar a landing page também
  try {
    console.log("Acessando Landing Page Template...");
    await page.goto('http://localhost:3000/templates/landing-page', { waitUntil: 'networkidle2' });
    const lpPath = path.join(outputDir, 'landing_page.png');
    await page.screenshot({ path: lpPath, fullPage: true });
    console.log("Screenshot Landing Page salvo em:", lpPath);
  } catch (e) {
    console.log("Erro na landing page", e.message);
  }

  await browser.close();
}

run().catch(console.error);
