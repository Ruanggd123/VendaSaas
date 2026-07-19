export const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

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
    'access_token': apiKey || ASAAS_API_KEY,
  };
}

function getApiUrl(apiUrl?: string) {
  return apiUrl || ASAAS_API_URL;
}

export const createCustomer = async (customer: Customer, apiKey?: string, apiUrl?: string) => {
  const response = await fetch(`${getApiUrl(apiUrl)}/customers`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(customer)
  });

  return response.json();
};

export const createPayment = async (data: PaymentData, apiKey?: string, apiUrl?: string) => {
  const response = await fetch(`${getApiUrl(apiUrl)}/payments`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(data)
  });

  return response.json();
};

export const createSubscription = async (
  customerId: string,
  plan: SubscriptionPlan,
  externalReference?: string,
  apiKey?: string,
  apiUrl?: string
) => {
  const response = await fetch(`${getApiUrl(apiUrl)}/subscriptions`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      customer: customerId,
      billingType: plan.billingType,
      value: plan.price,
      nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      description: plan.name,
      cycle: plan.period === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
      externalReference,
    })
  });

  return response.json();
};

export const getSubscriptionPayments = async (subscriptionId: string, apiKey?: string, apiUrl?: string) => {
  const response = await fetch(`${getApiUrl(apiUrl)}/subscriptions/${subscriptionId}/payments`, {
    headers: getHeaders(apiKey),
  });
  return response.json();
};
