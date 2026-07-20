const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const artifactDir = "C:\\Users\\Ruan Gomes\\.gemini\\antigravity\\brain\\596fdc2f-9c57-4e14-a34d-06b067129f5e";
  const outputDir = path.join(artifactDir, 'scratch');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Iniciando navegador...");
  // Removendo headless "new" para usar o antigo, as vezes ajuda com problemas de GPU/fontes.
  // Ou podemos usar args para habilitar webgl e disable-gpu
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    defaultViewport: { 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 2 // Retna display para super nitidez
    }
  });
  
  const page = await browser.newPage();
  
  console.log("Acessando a Home...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Garantir que as fontes web (Google Fonts) carreguem
  await page.evaluateHandle('document.fonts.ready');
  console.log("Fontes prontas. Aguardando animações...");
  
  // Aguardar muito tempo para ter certeza que as animações de entrada acabaram
  await new Promise(r => setTimeout(r, 10000));
  
  const homePath = path.join(outputDir, 'home_hd.png');
  await page.screenshot({ path: homePath, fullPage: true });
  console.log("Screenshot Home HD salvo em:", homePath);
  
  try {
    console.log("Acessando Landing Page Template...");
    await page.goto('http://localhost:3000/templates/landing-page', { waitUntil: 'networkidle0', timeout: 60000 });
    
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 10000));
    
    const lpPath = path.join(outputDir, 'landing_page_hd.png');
    await page.screenshot({ path: lpPath, fullPage: true });
    console.log("Screenshot Landing Page HD salvo em:", lpPath);
  } catch (e) {
    console.log("Erro na landing page", e.message);
  }

  await browser.close();
}

run().catch(console.error);
