import { templates } from './templates';

const INVALID_VALUES = [
  'não especificado', 'nao especificado', 'não informado', 'nao informado',
  'n/a', 'na', 'null', 'undefined', 'vazio', '-', '--', '...', ' '
];

export function validateIntent(intent: string, parameters: any, toolDefinitions: any) {
  const tool = toolDefinitions.find((t: any) => t.function.name === intent);

  if (!tool) {
    return {
      valid: false,
      response: templates.generic_error(`A intenção '${intent}' não é reconhecida no sistema.`),
    };
  }

  const requiredFields = tool.function.parameters.required || [];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = parameters[field];

    if (value === null || value === undefined) {
      missingFields.push(field);
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed.length === 0) {
        missingFields.push(field);
        continue;
      }

      if (INVALID_VALUES.includes(trimmed.toLowerCase())) {
        missingFields.push(field);
        continue;
      }
    }

    if (typeof value === 'number' && Number.isNaN(value)) {
      missingFields.push(field);
      continue;
    }

    if (typeof value === 'boolean') {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        missingFields.push(field);
      }
      continue;
    }

    if (typeof value === 'object') {
      if (Object.keys(value).length === 0) {
        missingFields.push(field);
      }
      continue;
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      response: templates.missing_info(missingFields),
    };
  }

  return {
    valid: true,
    parameters,
  };
}
