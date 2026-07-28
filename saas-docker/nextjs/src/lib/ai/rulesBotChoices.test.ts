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

const dates = ["Terça-feira (28/07)", "Quarta-feira (29/07)"];
assert.equal(resolveChoiceIndex("Terça-feira (28/07)", dates), 0);
assert.equal(resolveChoiceIndex("tercafeira 2807", dates), 0);
assert.equal(resolveChoiceIndex("2", dates), 1);

assert.equal(resolveChoiceIndex("14:30", ["14:30", "15:00"]), 0);
assert.equal(resolveChoiceIndex("1430", ["14:30", "15:00"]), 0);
assert.equal(resolveChoiceIndex("Entrega Física", ["Envio Digital", "Entrega Física"]), 1);
assert.equal(resolveChoiceIndex("Confirmar", ["Confirmar", "Cancelar"]), 0);
assert.equal(resolveChoiceIndex("Cancelar", ["Confirmar", "Cancelar"]), 1);
assert.equal(resolveChoiceIndex("PIX", ["PIX", "Cartão de Crédito"]), 0);
assert.equal(resolveChoiceIndex("Cartão de Crédito", ["PIX", "Cartão de Crédito"]), 1);
assert.equal(resolveChoiceIndex("Pagar com Cartão", ["Pagar com PIX", "Pagar com Cartão", "Cancelar cobrança"]), 1);
assert.equal(resolveChoiceIndex("Tarde", ["Manhã", "Tarde"]), 1);

console.log("rulesBot choice tests passed");
