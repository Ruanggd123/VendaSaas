import assert from "node:assert/strict";
import { resolveChoiceIndex } from "./rulesBot";

const products = [
  "Site Institucional",
  "Plataforma Completa",
  "Plano Site Grátis",
];

assert.equal(resolveChoiceIndex("1", products), 0);
assert.equal(resolveChoiceIndex("Plataforma Completa", products), 1);
assert.equal(resolveChoiceIndex("Site Institucional - R$ 497", products), 0);
assert.equal(resolveChoiceIndex("Plano Site Grátis - R$ 97/mês", products), 2);
assert.equal(resolveChoiceIndex("Produto inexistente - R$ 10", products), -1);

console.log("rulesBot choice tests passed");
