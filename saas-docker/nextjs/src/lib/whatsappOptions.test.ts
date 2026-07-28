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

console.log("whatsappOptions tests passed");
