export const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://asaas.com/api/v3';

export interface Customer {
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  period: 'MONTHLY' | 'YEARLY';
  description: string;
}

export interface PaymentData {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}

function getHeaders(apiKey?: string) {
  return {
    'Content-Type': 'application/json',
    'access_token': (apiKey || ASAAS_API_KEY).trim(),
  };
}

function getApiUrl(apiUrl?: string) {
  return apiUrl || ASAAS_API_URL;
}

async function asaasFetch(endpoint: string, options: any = {}, apiKey?: string, apiUrl?: string) {
  const primaryUrl = getApiUrl(apiUrl);
  let response = await fetch(`${primaryUrl}${endpoint}`, {
    ...options,
    headers: getHeaders(apiKey),
  });

  let resJson: any = {};
  try {
    resJson = await response.json();
  } catch (e) {
    return { errors: [{ description: 'Erro de resposta do gateway Asaas' }] };
  }

  // Se o Asaas avisar que a chave de API não pertence ao ambiente fornecido (Sandbox vs Produção)
  if (resJson.errors && Array.isArray(resJson.errors)) {
    const isEnvMismatch = resJson.errors.some((e: any) =>
      e.description?.toLowerCase().includes("não pertence a este ambiente") ||
      e.description?.toLowerCase().includes("nao pertence a este ambiente") ||
      e.code === "invalid_environment"
    );

    if (isEnvMismatch) {
      const fallbackUrl = primaryUrl.includes("sandbox")
        ? "https://asaas.com/api/v3"
        : "https://sandbox.asaas.com/api/v3";

      console.log(`⚠️ [Asaas] Alternando ambiente automaticamente para: ${fallbackUrl}`);

      const fallbackResponse = await fetch(`${fallbackUrl}${endpoint}`, {
        ...options,
        headers: getHeaders(apiKey),
      });

      try {
        resJson = await fallbackResponse.json();
      } catch (e) {}
    }
  }

  return resJson;
}

export const createCustomer = async (customer: Customer, apiKey?: string, apiUrl?: string) => {
  const resJson = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(customer)
  }, apiKey, apiUrl);

  if (resJson.id) return resJson;

  // Fallback: Se já existir cliente cadastrado com esse telefone/mobile no Asaas
  try {
    const cleanPhone = (customer.phone || "").replace(/\D/g, "");
    if (cleanPhone) {
      const searchData = await asaasFetch(`/customers?phone=${cleanPhone}`, { method: 'GET' }, apiKey, apiUrl);
      if (searchData.data && searchData.data.length > 0) {
        return searchData.data[0];
      }
    }
  } catch (e) {
    console.error("Erro ao buscar cliente existente no Asaas:", e);
  }

  return resJson;
};

export const createPayment = async (data: PaymentData, apiKey?: string, apiUrl?: string) => {
  return await asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(data)
  }, apiKey, apiUrl);
};

export const createSubscription = async (
  customerId: string,
  plan: SubscriptionPlan,
  externalReference?: string,
  apiKey?: string,
  apiUrl?: string
) => {
  return await asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: plan.billingType,
      value: plan.price,
      nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      description: plan.name,
      cycle: plan.period === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
      externalReference,
    })
  }, apiKey, apiUrl);
};

export const getSubscriptionPayments = async (subscriptionId: string, apiKey?: string, apiUrl?: string) => {
  return await asaasFetch(`/subscriptions/${subscriptionId}/payments`, { method: 'GET' }, apiKey, apiUrl);
};
