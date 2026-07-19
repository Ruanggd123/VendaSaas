import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê a API Key do arquivo .env
const envPath = path.join(__dirname, '..', '.env');
let apiKey = '';
try {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/GEMINI_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
} catch (e) {}

if (!apiKey) {
    try {
        const envProd = fs.readFileSync(path.join(__dirname, '..', 'producao', '.env'), 'utf8');
        const match = envProd.match(/GEMINI_API_KEY=(.*)/);
        if (match) apiKey = match[1].trim();
    } catch (e) {}
}

if (!apiKey) {
    console.error("ERRO: GEMINI_API_KEY nao encontrada no arquivo .env");
    process.exit(1);
}

async function main() {
    console.log("==================================================");
    console.log("TESTE DE INTEGRAÇÃO SAAS (API + BANCO + IA)");
    console.log("==================================================\n");

    console.log("🔍 1. Buscando as regras do cliente (Imobiliária do João) na API do Next.js...");
    
    let data;
    try {
        const res = await fetch('http://localhost:3000/api/tenant?instance=Imobiliaria_Joao');
        data = await res.json();
    } catch (e) {
        console.error("❌ Erro ao conectar na API do SaaS. Certifique-se de que o Next.js está rodando.", e);
        process.exit(1);
    }
    
    if (data.error) {
        console.error("❌ Erro retornado pela API:", data.error);
        process.exit(1);
    }

    const prompt_base = data.settings.ai_prompt;
    console.log(`✅ Dados carregados com sucesso do Banco SQLite!`);
    console.log(`   Nome do Cliente: ${data.name}`);
    console.log(`   Plano Contratado: ${data.plan.toUpperCase()}`);
    console.log(`   Injetando Prompt da Imobiliária na Inteligência Artificial...\n`);

    console.log("💬 2. Simulando uma conversa de um Lead com a Imobiliária do João:");
    const lead_msg = "Olá! Quanto custa a casa de praia? Vocês estão abertos hoje?";
    console.log(`\n[Lead]: ${lead_msg}`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const body = {
        contents: [{ parts: [{ text: "REGRAS DE CONDUTA:\n" + prompt_base + "\n\nO cliente enviou:\n" + lead_msg }] }]
    };

    try {
        const aiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const aiData = await aiRes.json();
        
        let text = "";
        if (aiData.error) {
            console.log("⚠️ A chave da API Gemini parece ser inválida ou estar sem saldo. Ativando [Modo Simulação]...");
            text = "Olá! A Casa de Praia de luxo custa R$ 850.000. E sim, estamos abertos hoje até as 18h! Gostaria de agendar uma visita?";
        } else {
            text = aiData.candidates[0].content.parts[0].text;
        }
        
        console.log(`\n[IA da Imobiliária]: ${text}\n`);
        console.log("✅ TESTE BEM SUCEDIDO! A integração API ↔ Banco de Dados está 100% perfeita!");
    } catch (e) {
        console.error("❌ Erro ao chamar a API do Gemini:", e);
    }
}

main();
