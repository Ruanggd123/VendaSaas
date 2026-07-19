

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🚀 [Automated Setup] Aguardando a Evolution API iniciar na porta 8080...");
    
    let isAlive = false;
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch("http://localhost:8080/health");
            if (res.ok) {
                isAlive = true;
                break;
            }
        } catch (e) {}
        await delay(2000);
    }

    if (!isAlive) {
        console.error("❌ Evolution API demorou demais para iniciar.");
        process.exit(1);
    }

    console.log("✅ Evolution API online!");

    // 1. Criar Instância
    console.log("📲 Criando a instância do WhatsApp (joao_imobiliaria)...");
    try {
        const res = await fetch("http://localhost:8080/instance/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instanceName: "joao_imobiliaria",
                qrcode: true,
                number: "5511999999999"
            })
        });
        const data = await res.json();
        if (data.qrcode) {
            console.log("\n=======================================================");
            console.log("📸 ATENÇÃO: ABRA O NAVEGADOR PARA LER O QR CODE!");
            console.log("👉 http://localhost:8080/instance/joao_imobiliaria/qrcode?format=image");
            console.log("=======================================================\n");
        }
    } catch (e) {
        console.error("Falha ao criar instância:", e);
    }

    // 2. Configurar Webhook
    console.log("🔗 Configurando Webhook para apontar para o n8n...");
    try {
        await fetch("http://localhost:8080/instance/joao_imobiliaria/webhook", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enabled: true,
                url: "http://localhost:5678/webhook/mensagem",
                events: ["messages.upsert"]
            })
        });
        console.log("✅ Webhook configurado com sucesso!");
    } catch (e) {
        console.error("Falha ao configurar Webhook:", e);
    }
}

main();
