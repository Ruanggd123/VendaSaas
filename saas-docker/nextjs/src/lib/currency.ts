export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBRL(value: unknown) {
  const parsed = parseMoney(value);
  return parsed === null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed);
}

export function getProductPrice(product: { price?: unknown; monthly?: unknown; type?: string } | null | undefined): number {
  if (!product) return 0;
  const priceVal = parseMoney(product.price);
  const monthlyVal = parseMoney(product.monthly);
  if (priceVal !== null && priceVal > 0) return priceVal;
  if (monthlyVal !== null && monthlyVal > 0) return monthlyVal;
  return priceVal ?? monthlyVal ?? 0;
}

export function getProductPriceLabel(product: { price?: unknown; monthly?: unknown; type?: string; is_subscription?: boolean } | null | undefined) {
  if (!product) return null;
  const price = getProductPrice(product);
  if (!price && price !== 0) return null;
  const formatted = formatBRL(price);
  const isSub = (product as any).is_subscription !== false && ((product.monthly !== undefined && product.monthly !== null && product.monthly !== "") || product.type === "plan");
  return formatted ? `${formatted}${isSub ? "/mês" : ""}` : null;
}
