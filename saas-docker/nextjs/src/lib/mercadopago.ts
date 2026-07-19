interface MPItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createPreference(
  accessToken: string,
  items: MPItem[],
  externalReference: string,
  notificationUrl: string,
  backUrls: { success: string; failure: string; pending: string }
): Promise<MPPreference> {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: backUrls,
      auto_return: 'approved',
      statement_descriptor: 'NEXUS AI',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mercado Pago error: ${res.status} ${err}`);
  }

  return res.json();
}
