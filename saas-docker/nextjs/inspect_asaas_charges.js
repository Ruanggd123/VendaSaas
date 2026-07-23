const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectAsaas() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: "8806e428-9205-481f-933e-0fb52e32d02c" }
  });
  const parsed = JSON.parse(tenant.settings || '{}');
  const apiKey = parsed.asaas_test_api_key || parsed.asaas_api_key;

  const res = await fetch("https://sandbox.asaas.com/api/v3/payments?limit=10", {
    headers: { "access_token": apiKey }
  });
  const data = await res.json();

  console.log("=== ÚLTIMAS 10 COBRANÇAS GERADAS NO ASAAS ===");
  data.data.forEach(p => {
    console.log(`- ID: ${p.id} | Valor: R$ ${p.value} | Status: ${p.status} | Vencimento: ${p.dueDate} | Descrição: ${p.description} | Recorrente: ${p.subscription || 'Não'}`);
  });
}

inspectAsaas().finally(() => prisma.$disconnect());
