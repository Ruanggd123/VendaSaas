import assert from "node:assert/strict";
import { formatWhatsAppOptionText } from "./whatsappOptions";

const options = [
  { text: "Catálogo", id: "1" },
  { text: "Horários", id: "2" },
];

const duplicatedMenu = `Olá! Seja bem-vindo.

Digite o número da opção que você deseja:

Escolha uma opção abaixo:

1️⃣ Catálogo
2️⃣ Horários`;

assert.equal(
  formatWhatsAppOptionText(duplicatedMenu, options, true),
  "Olá! Seja bem-vindo.",
);

assert.equal(
  formatWhatsAppOptionText("Olá! Seja bem-vindo.", options, false),
  "Olá! Seja bem-vindo.\n\nEscolha uma opção:\n1 - Catálogo\n2 - Horários",
);

assert.equal(
  formatWhatsAppOptionText("Qual é o seu nome?", [], true),
  "Qual é o seu nome?",
);

const catalogOptions = [
  { text: "Site Institucional - R$ 497", id: "1" },
  { text: "Plataforma Completa - R$ 997", id: "2" },
];
const catalog = `📋 *Nossos Serviços e Preços:*

1️⃣ *Site Institucional* - R$ 497
   _Site responsivo e otimizado._

2️⃣ *Plataforma Completa* - R$ 997
   _CRM completo e painel de vendas._

✍️ Responda enviando o número do produto.

Digite *0* ou *voltar* para retornar ao menu principal.`;

assert.equal(
  formatWhatsAppOptionText(catalog, catalogOptions, true),
  "📋 *Nossos Serviços e Preços:*\n\nDigite *0* ou *voltar* para retornar ao menu principal.",
);

console.log("whatsappOptions tests passed");
