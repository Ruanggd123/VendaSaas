import assert from "node:assert/strict";
import { formatBRL, getProductPriceLabel, parseMoney } from "./currency";

assert.equal(parseMoney("1.997,50"), 1997.5);
assert.equal(formatBRL(97), "R$ 97,00");
assert.equal(getProductPriceLabel({ price: 497 }), "R$ 497,00");
assert.equal(getProductPriceLabel({ price: 0, monthly: 97, type: "plan" }), "R$ 97,00/mês");

console.log("currency tests passed");
