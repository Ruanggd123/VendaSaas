export const templates = {
  // Respostas de Sucesso
  os_created: (protocolo: string, aparelho: string, defeito: string) => 
    `✅ *Ordem de serviço aberta com sucesso!*\n\n📱 Aparelho: ${aparelho}\n🔧 Defeito relatado: ${defeito}\n📌 Protocolo: #${protocolo}\n\nSua OS está com o status "Aguardando Avaliação Técnica". Entraremos em contato em breve com o valor do orçamento.`,
  
  appointment_scheduled: (data: string, hora: string, servico: string, prestador: string, valor?: string) => {
    let msg = `📅 *Agendamento Confirmado!*\n\nServiço: ${servico}\nData: ${data}\nHora: ${hora}\nProfissional: ${prestador}`;
    if (valor) msg += `\nValor estimado: R$ ${valor}`;
    return msg;
  },

  order_created: (pedido_id: string, total: string, forma_entrega: string) =>
    `🛍️ *Pedido Registrado!*\n\nNº do Pedido: #${pedido_id}\nTotal: R$ ${total}\nEntrega: ${forma_entrega}\n\nAguardamos a confirmação do pagamento para prosseguir.`,

  payment_link_generated: (url: string, valor: string) =>
    `💳 *Link de Pagamento Gerado*\n\nValor: R$ ${valor}\nAcesse o link abaixo para efetuar o pagamento com segurança:\n\n👉 ${url}`,

  guia_requested: (tipo: string, mes: string) =>
    `📄 *Solicitação de Guia Recebida*\n\nTipo: ${tipo}\nPeríodo: ${mes}\n\nA solicitação foi enviada para o departamento contábil. Assim que a guia for gerada, entraremos em contato.`,

  // Respostas de Falha/Validação
  missing_info: (fields: string[]) => 
    `⚠️ *Preciso de mais alguns detalhes para continuar.*\n\nPor favor, me informe:\n- ${fields.join('\n- ')}`,

  generic_error: (message: string) =>
    `❌ Ocorreu um erro ao processar sua solicitação: ${message}`,

  not_found: (entity: string) =>
    `🔍 Não consegui encontrar informações sobre: ${entity}. Pode verificar se digitou corretamente?`
};
