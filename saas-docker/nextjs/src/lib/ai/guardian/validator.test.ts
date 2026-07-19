import assert from 'node:assert/strict';
import { validateIntent } from './validator';

const toolDefinitions = [
  {
    function: {
      name: 'criar_ordem_servico',
      parameters: {
        required: ['modelo_aparelho', 'defeito_relatado', 'orcamento_estimado'],
      },
    },
  },
];

const validResult = validateIntent(
  'criar_ordem_servico',
  {
    modelo_aparelho: 'iPhone 14',
    defeito_relatado: 'Não carrega',
    orcamento_estimado: 0,
  },
  toolDefinitions,
);

assert.equal(validResult.valid, true, 'Um valor numérico válido não deve ser tratado como ausente');
assert.equal(validResult.parameters.orcamento_estimado, 0);

const invalidResult = validateIntent(
  'criar_ordem_servico',
  {
    modelo_aparelho: '',
    defeito_relatado: 'Não carrega',
    orcamento_estimado: 0,
  },
  toolDefinitions,
);

assert.equal(invalidResult.valid, false, 'Campos vazios devem continuar sendo rejeitados');
assert.match(invalidResult.response as string, /modelo_aparelho/);

console.log('validator tests passed');
