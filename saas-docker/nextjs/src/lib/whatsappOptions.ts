export interface WhatsAppOption {
  text: string;
  id: string;
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
    return cleanText
      .split("\n")
      .filter((line) => {
        const normalizedLine = normalizeForMatch(line);
        const isBackInstruction = normalizedLine.includes("digite 0") || normalizedLine.includes("voltar");
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
