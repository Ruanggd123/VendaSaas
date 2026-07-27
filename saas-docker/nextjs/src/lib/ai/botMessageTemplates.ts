type MessageProduct = {
  name?: string;
  price?: unknown;
};

type DeliveryType = {
  deadline?: string;
};

type CheckoutMessageArgs = {
  product: MessageProduct;
  address: string;
  checkoutLink?: string;
};

function parseProductPrice(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value == null) {
    return NaN;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9.,-]/g, "");

  if (!normalized) {
    return NaN;
  }

  const hasExplicitSign = normalized.startsWith("-");
  const unsigned = hasExplicitSign ? normalized.slice(1) : normalized;

  if (!/[0-9]/.test(unsigned)) {
    return NaN;
  }

  const hasComma = unsigned.includes(",");
  const hasDot = unsigned.includes(".");

  if (!hasComma && !hasDot) {
    const parsed = Number(unsigned);
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    return hasExplicitSign ? -parsed : parsed;
  }

  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const integerPart = unsigned.slice(0, separatorIndex);
  const decimalPart = unsigned.slice(separatorIndex + 1);

  let parsedValue = "";

  if (decimalPart.length > 0 && decimalPart.length <= 2) {
    parsedValue = `${integerPart.replace(/[.,]/g, "")}.${decimalPart}`;
  } else {
    parsedValue = unsigned.replace(/[.,]/g, "");
  }

  let parsed = Number(parsedValue);
  if (!Number.isFinite(parsed)) {
    const parsedFallback = Number(unsigned.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(parsedFallback)) {
      return NaN;
    }

    parsed = parsedFallback;
  }

  return hasExplicitSign ? -parsed : parsed;
}

function formatMoney(value: unknown): string {
  const parsed = parseProductPrice(value);
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return parsed.toFixed(2);
}

export const botMessageTemplates = {
  labels: {
    bothDigital: (deadline = "imediato") => `Envio Digital (Prazo: ${deadline})`,
    bothPhysical: () => "Entrega Física no meu endereço",
    delivery: () => "Entrega (Delivery)",
    pickup: () => "Retirada na Loja",
    digitalImmediate: () => "Envio Digital Imediato",
  },

  checkout: {
    withPayment: (args: CheckoutMessageArgs) => {
      const name = args.product?.name || "Produto";
      const value = formatMoney(args.product?.price);
      const address = args.address;
      return `🛒 *Resumo do Pedido:* ${name}\n💰 *Valor:* R$ ${value}\n📍 *Entrega:* ${address}\n\n🔗 *Acesse o link para concluir a compra:* ${args.checkoutLink || ""}\n\nApós a aprovação, o pedido será liberado automaticamente! 🚀`;
    },

    withoutPayment: (args: CheckoutMessageArgs) => {
      const name = args.product?.name || "Produto";
      const value = formatMoney(args.product?.price);
      const address = args.address;
      return `🛒 *Produto:* ${name}\n💰 *Valor:* R$ ${value}\n🚚 *Método/Endereço:* ${address}\n\n✅ Pedido registrado com sucesso! O pagamento será realizado presencialmente na retirada ou momento da entrega. Obrigado!`;
    },
  },

  catalog: {
    bothMethods: (product: MessageProduct, delivery: DeliveryType = {}) => {
      const name = product?.name || "Produto";
      const price = formatMoney(product?.price);
      const deadline = delivery.deadline || "imediato";
      return `🛒 *Você selecionou:* ${name}\n💰 *Valor:* R$ ${price}\n\nEste produto está disponível nas opções Digital e Física. Como prefere receber?\n1️⃣ ${botMessageTemplates.labels.bothDigital(deadline)}\n2️⃣ ${botMessageTemplates.labels.bothPhysical()}\n\nResponda com o número correspondente (*1* ou *2*):`;
    },

    deliveryOrPickup: (product: MessageProduct) => {
      const name = product?.name || "Produto";
      const price = formatMoney(product?.price);
      return `🛒 *Você selecionou:* ${name}\n💰 *Valor:* R$ ${price}\n\nComo deseja receber o produto/serviço?\n1️⃣ ${botMessageTemplates.labels.delivery()}\n2️⃣ ${botMessageTemplates.labels.pickup()} / Presencial\n\nResponda com o número correspondente (*1* ou *2*):`;
    },
  },

  errors: {
    invalidBothMethodsChoice: () => "❌ Opção inválida. Digite *1* para Envio Digital ou *2* para Entrega Física:",
    invalidDeliveryChoice: () => "❌ Opção inválida. Digite *1* para Entrega (Delivery) ou *2* para Retirada na Loja:",
  },

  prompts: {
    requestAddress: () => "🚚 Por favor, envie seu endereço completo de entrega (Rua, Número, Bairro, Cidade):",
  },
};

export { formatMoney };
