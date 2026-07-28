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

export function getProductPriceLabel(product: { price?: unknown; monthly?: unknown; type?: string } | null | undefined) {
  if (!product) return null;
  const recurring = product.monthly !== undefined && product.monthly !== null && product.monthly !== ""
    || product.type === "plan";
  const value = recurring ? (product.monthly ?? product.price) : product.price;
  const formatted = formatBRL(value);
  return formatted ? `${formatted}${recurring ? "/mês" : ""}` : null;
}
