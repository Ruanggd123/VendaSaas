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
  paymentMode?: "pix" | "link" | "both";
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
  paymentMethod?: string;
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
      const checkoutUrl = args.checkoutLink || "";

      const pixCode = args.pixCopiaECola || "";

      let text = `🛒 *Resumo do Pedido:* ${name}\n💰 *Valor:* R$ ${value}`;

      if (pixCode) {
        text += `\n\n📱 *Pix Copia e Cola:*\n\`${pixCode}\``;
      }
      
      if (checkoutUrl) {
        text += `\n\n🔗 *Link para pagamento:* ${checkoutUrl}`;
      }

      text += `\n\n✅ Após a confirmação, seu pedido será liberado!`;
      return text;
    },

    withoutPayment: (args: CheckoutMessageArgs) => {
      const name = args.product?.name || "Produto";
      const value = formatMoney(args.product?.price);
      const address = args.address;
      return `🛒 *${name}* - R$ ${value}\n📍 ${address}\n\n✅ Pedido registrado! O pagamento será combinado na entrega/retirada.`;
    },
  },

  catalog: {
    bothMethods: (product: MessageProduct, delivery: DeliveryType = {}) => {
      const name = product?.name || "Produto";
      const price = formatMoney(product?.price);
      const deadline = delivery.deadline || "imediato";
      return `🛒 *${name}* - R$ ${price}\n\nComo prefere receber?\n1️⃣ ${botMessageTemplates.labels.bothDigital(deadline)}\n2️⃣ ${botMessageTemplates.labels.bothPhysical()}\n\nResponda *1* ou *2*:`;
    },

    deliveryOrPickup: (product: MessageProduct) => {
      const name = product?.name || "Produto";
      const price = formatMoney(product?.price);
      return `🛒 *${name}* - R$ ${price}\n\nComo deseja receber?\n1️⃣ ${botMessageTemplates.labels.delivery()}\n2️⃣ ${botMessageTemplates.labels.pickup()}\n\nResponda *1* ou *2*:`;
    },
  },

  errors: {
    invalidBothMethodsChoice: () => "❌ Opção inválida. Responda *1* para Digital ou *2* para Física:",
    invalidDeliveryChoice: () => "❌ Opção inválida. Responda *1* para Entrega ou *2* para Retirada:",
  },

  prompts: {
    requestAddress: () => "📍 Por favor, informe seu endereço completo para entrega (rua, número, bairro, cidade):",
  },
};

export { formatMoney };
