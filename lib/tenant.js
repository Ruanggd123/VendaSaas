// Simulação de banco de dados de tenants
const tenants = {
  'tenant1': {
    company: 'Empresa A',
    phone: '+5511999999999',
    paymentLink: 'https://pagamento.empresa.com/tenant1',
    pixKey: '123e4567-e89b-12d3-a456-426614174000',
    welcomeMessage: 'Bem-vindo à Empresa A!',
    flows: {
      greeting: 'Olá! Como podemos ajudar?',
      prices: 'Nossos preços: ...',
      payment: 'Pagamento via PIX ou link'
    }
  }
  // Adicione mais tenants conforme necessário
};

export async function getTenantConfig(tenantId) {
  return tenants[tenantId] || null;
}

export async function getTenantByPhone(phone) {
  return Object.values(tenants).find(t => t.phone === phone) || null;
}
