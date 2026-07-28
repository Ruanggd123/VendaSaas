export interface WhatsAppOption {
  text: string;
  id: string;
}

export function ensureMinimumWhatsAppPollOptions(
  options: WhatsAppOption[],
  interactiveEnabled: boolean,
) {
  if (!interactiveEnabled || options.length !== 1 || options[0].id === "0") return options;
  return [...options, { text: "Voltar", id: "0" }];
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*_`]/g, "")
    .toLowerCase()
    .trim();
}

export function formatWhatsAppOptionText(
  text: string,
  options: WhatsAppOption[],
  interactiveEnabled: boolean,
) {
  const cleanText = text.trim();
  if (options.length === 0) return cleanText;

  const normalizedLabels = options.map((option) => normalizeForMatch(option.text));

  if (interactiveEnabled) {
    let insideOptionDetails = false;
    let backInstructionSeen = false;
    const hasBackOption = normalizedLabels.some((label) => label === "voltar" || label === "menu principal");
    return cleanText
      .split("\n")
      .filter((line) => {
        const normalizedLine = normalizeForMatch(line);
        const isBackInstruction = normalizedLine.includes("digite 0") || normalizedLine.includes("voltar");
        if (isBackInstruction && hasBackOption) return false;
        if (isBackInstruction) {
          if (backInstructionSeen) return false;
          backInstructionSeen = true;
        }
        if (insideOptionDetails && isBackInstruction) {
          insideOptionDetails = false;
          return true;
        }

        const isChoiceInstruction =
          /^(escolha|selecione).*(opcao|opcoes|produto|servico|item)/.test(normalizedLine) ||
          /(digite|envie|responda).*(numero|opcao)/.test(normalizedLine) ||
          (normalizedLine.includes("digite") &&
            normalizedLabels.filter((label) => label && normalizedLine.includes(label)).length >= 2);
        if (isChoiceInstruction) return false;

        const isNumberedLine = /^\d/.test(normalizedLine);
        const containsOption = normalizedLabels.some((label) => label && normalizedLine.includes(label));
        if (isNumberedLine && containsOption) {
          insideOptionDetails = true;
          return false;
        }

        if (insideOptionDetails) return false;
        return true;
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const normalizedText = normalizeForMatch(cleanText);
  const optionsAlreadyVisible = normalizedLabels.every((label) => label && normalizedText.includes(label));
  if (optionsAlreadyVisible) return cleanText;

  return `${cleanText}\n\nEscolha uma opção:\n${options
    .map((option) => `${option.id} - ${option.text}`)
    .join("\n")}`;
}
