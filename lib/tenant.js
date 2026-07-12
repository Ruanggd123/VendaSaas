// Simulação de banco de dados de tenants
const tenants = {
  'tenant1': {
    company: 'Empresa A',
    phone: '+5511999999999',
    humanAgent: '+5511888888888',
    welcomeMessage: 'Bem-vindo à Empresa A!',
    flows: {
      // Fluxo principal
      main: [
        {
          id: 'welcome',
          triggers: ['ola', 'oi', 'bom dia'],
          response: 'Olá! Bem-vindo à Empresa A. Escolha uma opção:\n1 - Serviços\n2 - Preços\n3 - Agendamento\n4 - Falar com atendente',
          next: {
            '1': 'services',
            '2': 'prices',
            '3': 'scheduling',
            '4': 'human'
          }
        },
        {
          id: 'services',
          triggers: ['serviços', 'servico', '1'],
          response: 'Nossos serviços:\n- Desenvolvimento Web\n- Marketing Digital\n- Consultoria',
          next: {
            'voltar': 'welcome'
          }
        },
        {
          id: 'prices',
          triggers: ['preços', 'preco', '2'],
          response: 'Nossos preços:\n- Básico: R$ 100/mês\n- Premium: R$ 300/mês',
          next: {
            'voltar': 'welcome'
          }
        },
        {
          id: 'human',
          triggers: ['atendente', 'humano', '4'],
          response: 'Um atendente será contactado em breve. Por favor, aguarde.',
          action: 'notifyAgent' // Ação especial
        }
      ]
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
