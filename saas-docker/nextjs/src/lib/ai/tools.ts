import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const aiTools = [
  {
    type: "function",
    function: {
      name: "gerar_link_pagamento",
      description: "Gera um link de pagamento do Mercado Pago para cobrar o cliente. REGRAS: 1. NUNCA chame se o cliente estiver apenas perguntando informações, detalhes, ou como funciona o produto/serviço (ex: 'como funciona o bot?'). 2. APENAS chame se o cliente disser explicitamente que quer comprar, contratar, assinar, ou pedir o link de pagamento.",
      parameters: {
        type: "object",
        properties: {
          valor: {
            type: "number",
            description: "Valor da cobrança em reais. Exemplo: 15.50",
          },
          descricao: {
            type: "string",
            description: "Descrição do produto ou serviço sendo cobrado. Ex: Consulta, Mensalidade",
          },
        },
        required: ["valor", "descricao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "agendar_compromisso",
      description: "Cria um agendamento na agenda. REGRAS ABSOLUTAS: 1. NUNCA invente data/hora. Sempre pergunte ao cliente. 2. NUNCA use placeholders como 'não especificado', 'N/A', '-', ou 'vazio'. Se não foi dito, não preencha o campo (retorne null/undefined). 3. É PROIBIDO inferir o serviço. Pergunte nome e telefone se não tiver no contexto. Antes de chamar, mostre resumo e peça confirmação EXPLÍCITA.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "string",
            description: "Data do agendamento no formato YYYY-MM-DD. NUNCA invente, adivinhe ou use placeholders. Você DEVE perguntar ao cliente qual dia ele prefere.",
          },
          hora: {
            type: "string",
            description: "Horário do agendamento no formato HH:MM. NUNCA invente, assuma ou use placeholders. Você DEVE perguntar ao cliente.",
          },
          titulo: {
            type: "string",
            description: "Título curto ou motivo do agendamento. NUNCA invente ou use placeholders. Pergunte qual serviço o cliente deseja.",
          },
        },
        required: ["data", "hora", "titulo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pausar_ia",
      description: "Pausa a Inteligência Artificial nesta conversa porque o cliente pediu para falar com um humano.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "Motivo pelo qual a IA está sendo pausada (ex: cliente irritado, dúvida complexa)",
          },
        },
        required: ["motivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_ordem_servico",
      description: "Abre uma ordem de serviço para reparo. REGRAS ABSOLUTAS: 1. NUNCA invente ou infira dados. 2. NUNCA use placeholders como 'não especificado', 'N/A', '-', ou 'vazio'. Se não foi dito, não preencha. 3. Descreva o problema exatamente como relatado (sem diagnósticos). O status inicial é SEMPRE 'aguardando_orçamento'.",
      parameters: {
        type: "object",
        properties: {
          modelo_aparelho: { type: "string", description: "Modelo exato do aparelho dito pelo cliente. NUNCA invente, adivinhe ou use placeholders." },
          defeito_relatado: { type: "string", description: "Sintomas relatados exatamente pelo cliente. NUNCA invente, adivinhe ou use placeholders." },
          orcamento_estimado: { type: "number", description: "NUNCA invente esse valor. Se não houver, envie 0." }
        },
        required: ["modelo_aparelho", "defeito_relatado"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_status_os",
      description: "Consulta o status atual de uma Ordem de Serviço. REGRAS: Apenas retorne o status REAL. NUNCA invente status. Se falhar, peça mais informações. Não prometa prazos com base no status.",
      parameters: {
        type: "object",
        properties: {
          os_id: { type: "string", description: "O número de identificação da OS" }
        },
        required: ["os_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_pedido_varejo",
      description: "Cria um pedido de varejo. REGRAS ABSOLUTAS: 1. NUNCA invente, adivinhe ou use placeholders como 'não especificado'. 2. Consulte o catálogo para preços exatos. PROIBIDO produto inexistente.",
      parameters: {
        type: "object",
        properties: {
          produtos: { 
            type: "array", 
            items: { type: "string" },
            description: "Nomes dos produtos exatos que o cliente está comprando. NUNCA use placeholders." 
          },
          valor_total: { type: "number", description: "Soma do valor total da compra. NUNCA invente preços." },
          endereco_entrega: { type: "string", description: "Endereço completo para entrega. Vazio se retirar na loja. Pergunte, NUNCA use placeholders!" }
        },
        required: ["produtos", "valor_total"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solicitar_guia_contabil",
      description: "Registra uma solicitação de guia contábil. REGRAS: NUNCA invente valores de impostos. Pergunte tipo exato (DARF, DAS, etc) e período. Peça documentos se necessário. NUNCA prometa prazos de entrega, diga que a equipe contábil entrará em contato.",
      parameters: {
        type: "object",
        properties: {
          tipo_guia: { type: "string", description: "Tipo de guia solicitada. Ex: DARF, Simples Nacional, GPS. Pergunte ao cliente!" },
          descricao: { type: "string", description: "Mais detalhes sobre a solicitação ou mês de competência." }
        },
        required: ["tipo_guia", "descricao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_status_pagamento",
      description: "Verifica se o último pagamento enviado para o cliente via Mercado Pago/PIX já foi confirmado e aprovado pelo sistema.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const adminTools = [
  {
    type: "function",
    function: {
      name: "list_paused_chats",
      description: "Lista todas as conversas do sistema que estão atualmente com a IA pausada (atendimento humano assumido).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_ai_status",
      description: "Ativa ou desativa a Inteligência Artificial para uma conversa específica através do número do cliente.",
      parameters: {
        type: "object",
        properties: {
          numero_cliente: {
            type: "string",
            description: "O número de telefone do cliente exatamente como ele aparece no sistema. Ex: 558899999999",
          },
          ai_paused: {
            type: "boolean",
            description: "true para PAUSAR (desligar) a IA, false para RETOMAR (ligar) a IA.",
          },
        },
        required: ["numero_cliente", "ai_paused"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "gerenciar_catalogo",
      description: "Adiciona, edita ou exclui um produto do catálogo de vendas.",
      parameters: {
        type: "object",
        properties: {
          acao: {
            type: "string",
            description: "A ação a ser realizada: 'adicionar', 'editar' ou 'excluir'",
            enum: ["adicionar", "editar", "excluir"]
          },
          nome: {
            type: "string",
            description: "Nome do produto ou serviço"
          },
          preco: {
            type: "number",
            description: "Preço do produto em reais (apenas para adicionar ou editar)"
          },
          descricao: {
            type: "string",
            description: "Descrição curta do produto (apenas para adicionar ou editar)"
          },
          estoque: {
            type: "number",
            description: "Quantidade em estoque (numero inteiro). Se não tiver limite, não informe."
          }
        },
        required: ["acao", "nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_agendamentos",
      description: "Lista todos os agendamentos do sistema com filtro por período (hoje, semana, mês, ou data específica). Retorna data, horário, serviço, status e nome do cliente.",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            description: "Período dos agendamentos: 'hoje', 'semana', 'mes', ou 'todos'. Padrão: 'mes'",
            enum: ["hoje", "semana", "mes", "todos"]
          }
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerenciar_configuracoes",
      description: "Atualiza as configurações do sistema, como horários de atendimento ou regras da IA.",
      parameters: {
        type: "object",
        properties: {
          chave: {
            type: "string",
            description: "A configuração a ser alterada (ex: 'business_hours_start', 'business_hours_end', 'off_hours_message', 'ai_prompt')"
          },
          valor: {
            type: "string",
            description: "O novo valor da configuração"
          }
        },
        required: ["chave", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_ou_atualizar_modulo",
      description: "Cria ou atualiza uma especialidade setorial customizada (módulo) para a empresa no banco de dados.",
      parameters: {
        type: "object",
        properties: {
          nome_tecnico: { type: "string", description: "Identificador único sem espaços. Ex: 'petshop', 'academia'." },
          titulo: { type: "string", description: "Nome legível da especialidade. Ex: 'Petshop & Veterinária'." },
          icone: { type: "string", description: "Um emoji representativo. Ex: '🐶', '🏋️'." },
          descricao: { type: "string", description: "Resumo do que a IA especialista faz para exibição no painel." },
          prompt_especialista: { type: "string", description: "As instruções de system prompt detalhadas contendo a identidade e regras da IA especialista." }
        },
        required: ["nome_tecnico", "titulo", "descricao", "prompt_especialista"],
      },
    },
  },
] as any;

export async function handleToolCall(toolCall: any, tenantId: string, contactNumber: string) {
  let args: any = {};
  try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

  if (toolCall.function.name === "gerenciar_catalogo") {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = JSON.parse((tenant?.settings as string) || "{}");
      let products = settings.products || [];

      const { acao, nome, preco, descricao, estoque } = args;

      if (acao === "adicionar") {
        products.push({ name: nome, price: preco, description: descricao || "", stock: estoque !== undefined ? estoque : null });
      } else if (acao === "editar") {
        const index = products.findIndex((p: any) => p.name.toLowerCase() === nome.toLowerCase());
        if (index > -1) {
          if (preco !== undefined) products[index].price = preco;
          if (descricao !== undefined) products[index].description = descricao;
          if (estoque !== undefined) products[index].stock = estoque;
        } else {
          return `Produto '${nome}' não encontrado no catálogo.`;
        }
      } else if (acao === "excluir") {
        const initialLen = products.length;
        products = products.filter((p: any) => p.name.toLowerCase() !== nome.toLowerCase());
        if (products.length === initialLen) return `Produto '${nome}' não encontrado no catálogo.`;
      }

      settings.products = products;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: JSON.stringify(settings) }
      });

      return `Sucesso! O produto '${nome}' foi ${acao} no catálogo. Agora a IA já está ciente desta mudança e pode vendê-lo.`;
    } catch (e: any) {
      return `Erro ao gerenciar catálogo: ${e.message}`;
    }
  }

  if (toolCall.function.name === "gerar_link_pagamento") {
    try {
      const productName = encodeURIComponent(args.descricao);
      const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/checkout/${tenantId}?product=${productName}`;
      return `🛒 *Confirme seus dados para finalizar a compra de ${args.descricao} (R$ ${args.valor})*\n\n🔗 Clique no link abaixo e preencha seu nome e telefone para gerar o pagamento:\n\n${checkoutUrl}\n\nApós o pagamento, enviaremos a confirmação aqui no WhatsApp! 🚀`;
    } catch (e: any) {
      return `Erro ao gerar link: ${e.message}`;
    }
  }

  if (toolCall.function.name === "agendar_compromisso") {
    try {
      // Salva no DB local
      const startDateTime = new Date(`${args.data}T${args.hora}:00`);
      if (startDateTime.getFullYear() < 2026) {
        startDateTime.setFullYear(2026);
      }

      // Buscar Lead
      let lead = await prisma.lead.findFirst({
        where: { tenant_id: tenantId, phone: contactNumber }
      });
      if (!lead) {
        lead = await prisma.lead.create({
          data: { tenant_id: tenantId, phone: contactNumber, name: contactNumber, status: 'NEW' }
        });
      }

      // Buscar produto nas settings
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      let products: any[] = [];
      try { products = JSON.parse(tenant?.settings as string || '{}').products || []; } catch {}
      const productInfo = products.find((p: any) => p.name?.toLowerCase() === args.titulo.toLowerCase());

      const requiresPayment = productInfo?.requires_payment === true;
      const status = requiresPayment ? "pending_payment" : "scheduled";

      await prisma.appointment.create({
        data: {
          tenant_id: tenantId,
          lead_id: lead.id,
          service_name: args.titulo,
          scheduled_at: startDateTime,
          status: status,
          notes: `customer_phone:${contactNumber}`
        }
      });

      if (requiresPayment) {
        const checkoutUrl = `${process.env.APP_URL || 'http://localhost:3000'}/checkout/${tenantId}?product=${encodeURIComponent(args.titulo)}&phone=${encodeURIComponent(contactNumber)}`;
        return `✅ Encontrei disponibilidade para ${args.data} às ${args.hora}! \n\n⚠️ Este serviço requer **pagamento antecipado**.\n\nPara confirmar o agendamento, por favor, realize o pagamento no link abaixo:\n\n🔗 ${checkoutUrl}\n\nSeu horário está pré-reservado e será confirmado automaticamente assim que o pagamento for aprovado!`;
      }

      const { templates } = await import('./guardian/templates');
      return templates.appointment_scheduled(args.data, args.hora, args.titulo, "Nossa Equipe", "");
    } catch (e: any) {
      return `Erro ao agendar compromisso: ${e.message}`;
    }
  }

  if (toolCall.function.name === "pausar_ia") {
    try {
      await prisma.conversation.updateMany({
        where: { tenant_id: tenantId, contact_number: contactNumber },
        data: { ai_paused: true }
      });
      return null;
    } catch (e: any) {
      return "Erro ao pausar IA.";
    }
  }

  if (toolCall.function.name === "ligar_ia") {
    try {
      await prisma.conversation.updateMany({
        where: { tenant_id: tenantId, contact_number: contactNumber },
        data: { ai_paused: false }
      });
      return "IA ligada com sucesso.";
    } catch (e: any) {
      return "Erro ao ligar IA.";
    }
  }

  if (toolCall.function.name === "list_paused_chats") {
    try {
      const paused = await prisma.conversation.findMany({
        where: { tenant_id: tenantId, ai_paused: true },
        select: { contact_number: true, contact_name: true }
      });
      if (paused.length === 0) return "Não há nenhuma conversa pausada no momento.";
      return `Lista de conversas pausadas:\n${paused.map(p => `- ${p.contact_name || 'Desconhecido'} (${p.contact_number})`).join('\n')}`;
    } catch (e) {
      return "Erro ao buscar conversas pausadas no banco.";
    }
  }

  if (toolCall.function.name === "toggle_ai_status") {
    try {
      const { numero_cliente, ai_paused } = args;
      const numClean = numero_cliente.replace(/\D/g, '');
      
      await prisma.conversation.updateMany({
        where: { tenant_id: tenantId, contact_number: numClean },
        data: { ai_paused: ai_paused === true || ai_paused === "true" }
      });
      return "Status da IA alterado com sucesso!";
    } catch (e: any) {
      return "Erro ao alterar status da IA.";
    }
  }

  if (toolCall.function.name === "listar_agendamentos") {
    try {
      const { periodo } = args;
      const now = new Date();
      let startDate: Date;
      let endDate: Date | undefined;

      if (periodo === "hoje") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else if (periodo === "semana") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
      } else if (periodo === "mes") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        startDate = new Date(0);
        endDate = undefined;
      }

      const where: any = { tenant_id: tenantId };
      if (endDate) {
        where.scheduled_at = { gte: startDate, lte: endDate };
      } else {
        where.scheduled_at = { gte: startDate };
      }

      const appointments = await prisma.appointment.findMany({
        where,
        include: { lead: { select: { name: true, phone: true } } },
        orderBy: { scheduled_at: "asc" },
      });

      if (appointments.length === 0) {
        return "Nenhum agendamento encontrado para o período solicitado.";
      }

      let response = `📅 *Agendamentos encontrados: ${appointments.length}*\n\n`;
      appointments.forEach((app, idx) => {
        const date = app.scheduled_at.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const time = app.scheduled_at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        const statusEmoji: Record<string, string> = { scheduled: "📌", confirmed: "✅", completed: "✔️", cancelled: "❌", no_show: "🚫" };
        const emoji = statusEmoji[app.status] || "📌";
        const cliente = app.lead?.name || "Sem cadastro";
        response += `${emoji} *${app.service_name}*\n   📅 ${date} às ${time}\n   👤 ${cliente}\n   📋 Status: ${app.status}\n\n`;
      });

      return response;
    } catch (e: any) {
      return `Erro ao listar agendamentos: ${e.message}`;
    }
  }

  if (toolCall.function.name === "gerenciar_configuracoes") {
    try {
      const { chave, valor } = args;
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = JSON.parse((tenant?.settings as string) || "{}");
      
      settings[chave] = valor;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: JSON.stringify(settings) }
      });

      return `Configuração '${chave}' atualizada para '${valor}' com sucesso!`;
    } catch (e: any) {
      return `Erro ao atualizar configuração: ${e.message}`;
    }
  }

  // FASE 2: Módulos Multissetoriais

  if (toolCall.function.name === "criar_ordem_servico") {
    try {
      const { modelo_aparelho, defeito_relatado, orcamento_estimado } = args;
      const os = await prisma.serviceOrder.create({
        data: {
          tenant_id: tenantId,
          device_model: modelo_aparelho,
          reported_issue: defeito_relatado,
          estimated_budget: orcamento_estimado || null,
          status: "pending",
          notes: `Gerado via IA para o número: ${contactNumber}`
        }
      });
      const { templates } = await import('./guardian/templates');
      return templates.os_created(os.id, modelo_aparelho, defeito_relatado);
    } catch (e: any) {
      return `Erro ao criar OS: ${e.message}`;
    }
  }

  if (toolCall.function.name === "consultar_status_os") {
    try {
      const { os_id } = args;
      const os = await prisma.serviceOrder.findUnique({ where: { id: os_id } });
      if (!os) return "Ordem de Serviço não encontrada.";
      if (os.tenant_id !== tenantId) return "Não encontrada nesta conta.";
      return `A Ordem de Serviço #${os.id} para o aparelho '${os.device_model}' está no status atual: '${os.status}'. Orçamento: R$ ${os.estimated_budget || 'Não definido'}.`;
    } catch (e: any) {
      return "Erro ao consultar OS. Informe ao cliente que o sistema está fora do ar.";
    }
  }

  if (toolCall.function.name === "criar_pedido_varejo") {
    try {
      const { produtos, valor_total, endereco_entrega } = args;
      const order = await prisma.retailOrder.create({
        data: {
          tenant_id: tenantId,
          total_amount: valor_total,
          shipping_address: endereco_entrega || "Retirada na Loja",
          status: "cart",
          items: {
            create: produtos.map((p: string) => ({
              product_name: p,
              unit_price: 0, // Simplified for MVP AI
              quantity: 1
            }))
          }
        }
      });
      const { templates } = await import('./guardian/templates');
      return templates.order_created(order.id, valor_total.toString(), endereco_entrega || "Retirada na Loja");
    } catch (e: any) {
      return `Erro ao criar pedido no sistema: ${e.message}`;
    }
  }

  if (toolCall.function.name === "solicitar_guia_contabil") {
    try {
      const { tipo_guia, descricao } = args;
      const task = await prisma.accountingTask.create({
        data: {
          tenant_id: tenantId,
          task_type: tipo_guia,
          description: descricao + ` | Solicitante WhatsApp: ${contactNumber}`,
          status: "requested"
        }
      });
      const { templates } = await import('./guardian/templates');
      return templates.guia_requested(tipo_guia, descricao);
    } catch (e: any) {
      return `Erro ao registrar solicitação contábil: ${e.message}`;
    }
  }

  if (toolCall.function.name === "criar_ou_atualizar_modulo") {
    try {
      const { nome_tecnico, titulo, icone, descricao, prompt_especialista } = args;
      const keyClean = nome_tecnico.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");

      const customMod = await prisma.customModule.upsert({
        where: {
          tenant_id_key: {
            tenant_id: tenantId,
            key: keyClean
          }
        },
        create: {
          tenant_id: tenantId,
          key: keyClean,
          title: titulo,
          icon: icone || "🏪",
          description: descricao,
          system_prompt: prompt_especialista
        },
        update: {
          title: titulo,
          icon: icone || "🏪",
          description: descricao,
          system_prompt: prompt_especialista
        }
      });

      return `Especialidade customizada '${titulo}' (${keyClean}) criada/atualizada com sucesso no banco de dados. Ela já está disponível para ativação no painel web da sua empresa!`;
    } catch (e: any) {
      return `Erro ao criar especialidade customizada: ${e.message}`;
    }
  }

  if (toolCall.function.name === "verificar_status_pagamento") {
    try {
      const lastSale = await prisma.sale.findFirst({
        where: {
          tenant_id: tenantId,
          notes: { contains: `customer_phone:${contactNumber}` }
        },
        orderBy: { created_at: "desc" }
      });

      if (!lastSale) {
        return "Nenhuma tentativa de pagamento encontrada para este contato.";
      }

      if (lastSale.status === "paid") {
        return `O pagamento para o produto/serviço '${lastSale.product_name}' no valor de R$ ${lastSale.amount.toFixed(2)} foi confirmado e aprovado com sucesso! 🎉`;
      } else {
        return `O pagamento para '${lastSale.product_name}' no valor de R$ ${lastSale.amount.toFixed(2)} consta como '${lastSale.status}'. Peça ao cliente para verificar se efetuou a transação no link de pagamento ou aguardar alguns instantes.`;
      }
    } catch (e: any) {
      return `Erro ao verificar pagamento: ${e.message}`;
    }
  }

  return "Ferramenta desconhecida ou não implementada.";
}
