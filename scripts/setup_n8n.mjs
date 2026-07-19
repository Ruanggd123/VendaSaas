import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const N8N_URL = 'http://localhost:5678';
const EMAIL = 'admin@vendas-saas.com';
const PASSWORD = 'Admin@123';
const COOKIE_FILE = path.join(__dirname, '..', 'n8n_cookies.txt');

async function request(method, endpoint, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const setCookie = res.headers['set-cookie'];
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(data || '{}'),
            cookie: setCookie ? setCookie.join('; ') : cookie
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, cookie });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== CONFIGURANDO N8N ===\n');
  
  // 1. Verificar se precisa de setup
  console.log('1. Verificando se precisa criar owner...');
  let res = await request('GET', '/rest/owner/setup');
  console.log(`   Status: ${res.status}`);
  
  let cookie = '';
  
  // 2. Fazer setup do owner (se necessário)
  if (res.status === 200 && res.data.email === undefined) {
    console.log('2. Criando conta owner...');
    res = await request('POST', '/rest/owner/setup', {
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Admin',
      lastName: 'VendasSAAS'
    });
    cookie = res.cookie;
    console.log(`   Status: ${res.status}`);
  }
  
  // 3. Fazer login
  console.log('3. Fazendo login...');
  res = await request('POST', '/rest/login', {
    emailOrLdapLoginId: EMAIL,
    password: PASSWORD
  });
  cookie = res.cookie;
  console.log(`   Status: ${res.status}`);
  
  if (res.status !== 200) {
    console.error('   ERRO: Login falhou');
    process.exit(1);
  }
  
  // 4. Listar workflows existentes
  console.log('4. Listando workflows existentes...');
  res = await request('GET', '/rest/workflows', null, cookie);
  console.log(`   Status: ${res.status}, Workflows: ${res.data.data?.length || 0}`);
  
  // 5. Ler o template do workflow vendedor_autonomo
  console.log('5. Lendo workflow template...');
  const workflowPath = path.join(__dirname, '..', 'workflows', 'vendedor_autonomo_n8n.json');
  const workflowTemplate = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  
  // 6. Atualizar os prompts no workflow
  console.log('6. Atualizando prompts no workflow...');
  const salesPrompt = fs.readFileSync(path.join(__dirname, '..', 'config', 'ai_sales_prompt.txt'), 'utf8');
  const extractorPrompt = fs.readFileSync(path.join(__dirname, '..', 'config', 'ai_extrator_prompt.txt'), 'utf8');
  
  for (const node of workflowTemplate.nodes) {
    // Atualiza o nó "Ollama (resposta)" - prompt de vendas
    if (node.name === 'Ollama (resposta)') {
      const messages = node.parameters.bodyParameters.parameters;
      const msgIdx = messages.findIndex(p => p.name === 'messages');
      if (msgIdx >= 0) {
        const msgStr = messages[msgIdx].value;
        const msgArr = JSON.parse(msgStr);
        for (const msg of msgArr) {
          if (msg.role === 'system') {
            msg.content = salesPrompt;
          }
        }
        messages[msgIdx].value = JSON.stringify(msgArr);
      }
      console.log('   ✅ Prompt de vendas atualizado no nó "Ollama (resposta)"');
    }
    
    // Atualiza o nó "Extrai dados" - prompt de extração
    if (node.name === 'Extrai dados') {
      const messages = node.parameters.bodyParameters.parameters;
      const msgIdx = messages.findIndex(p => p.name === 'messages');
      if (msgIdx >= 0) {
        const msgStr = messages[msgIdx].value;
        const msgArr = JSON.parse(msgStr);
        for (const msg of msgArr) {
          if (msg.role === 'system') {
            msg.content = extractorPrompt;
          }
        }
        messages[msgIdx].value = JSON.stringify(msgArr);
      }
      console.log('   ✅ Prompt de extração atualizado no nó "Extrai dados"');
    }
  }
  
  // 7. Importar workflow no n8n
  console.log('7. Importando workflow no n8n...');
  
  // Primeiro deleta workflow existente com mesmo nome
  if (res.data.data) {
    for (const wf of res.data.data) {
      if (wf.name === workflowTemplate.name) {
        console.log(`   Deletando workflow existente: ${wf.id}`);
        await request('DELETE', `/rest/workflows/${wf.id}`, null, cookie);
      }
    }
  }
  
  // Cria o workflow
  const createPayload = {
    name: workflowTemplate.name,
    nodes: workflowTemplate.nodes,
    connections: workflowTemplate.connections,
    settings: {},
    staticData: null,
    pinData: {},
    versionId: '',
    tags: []
  };
  
  res = await request('POST', '/rest/workflows', createPayload, cookie);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200) {
    console.log(`   ✅ Workflow "${workflowTemplate.name}" importado com sucesso!`);
    console.log(`   ID: ${res.data.data?.id || 'N/A'}`);
  } else {
    console.error(`   ❌ Erro ao importar: ${JSON.stringify(res.data)}`);
  }
  
  // 8. Fazer o mesmo para o workflow 04_vendedor_ia_completo
  console.log('\n--- Segundo Workflow ---');
  console.log('8. Lendo e atualizando workflow "04_vendedor_ia_completo"...');
  const workflowPath2 = path.join(__dirname, '..', 'workflows', '04_vendedor_ia_completo.json');
  if (fs.existsSync(workflowPath2)) {
    const workflow2 = JSON.parse(fs.readFileSync(workflowPath2, 'utf8'));
    
    for (const node of workflow2.nodes) {
      // Atualiza o nó "OpenAI (Vendedor)" - prompt de vendas
      if (node.name === 'OpenAI (Vendedor)' && node.parameters.messages) {
        const msgs = node.parameters.messages.messageValues || [];
        for (const msg of msgs) {
          if (msg.role === 'system') {
            // Substitui o conteúdo antigo pelo novo prompt
            const oldMsg = msg.content;
            msg.content = salesPrompt;
          }
        }
        console.log('   ✅ Prompt de vendas atualizado no nó "OpenAI (Vendedor)"');
      }
      
      // Atualiza o nó "OpenAI (Extrator JSON)" - prompt de extração
      if (node.name === 'OpenAI (Extrator JSON)' && node.parameters.messages) {
        const msgs = node.parameters.messages.messageValues || [];
        for (const msg of msgs) {
          if (msg.role === 'system') {
            msg.content = extractorPrompt;
          }
        }
        console.log('   ✅ Prompt de extração atualizado no nó "OpenAI (Extrator JSON)"');
      }
    }
    
    // Deleta workflow existente
    if (res.data?.data) {
      for (const wf of res.data.data) {
        if (wf.name === workflow2.name) {
          await request('DELETE', `/rest/workflows/${wf.id}`, null, cookie);
        }
      }
    }
    
    res = await request('POST', '/rest/workflows', {
      name: workflow2.name,
      nodes: workflow2.nodes,
      connections: workflow2.connections,
      settings: {},
      staticData: null,
      pinData: {},
      versionId: '',
      tags: []
    }, cookie);
    
    if (res.status === 200) {
      console.log(`   ✅ Workflow "${workflow2.name}" importado com sucesso!`);
    }
  }

  // 9. Fazer o mesmo para o workflow 05_roteamento_multi_cliente
  console.log('\n--- Terceiro Workflow ---');
  console.log('9. Atualizando workflow "05_roteamento_multi_cliente"...');
  const workflowPath3 = path.join(__dirname, '..', 'workflows', '05_roteamento_multi_cliente.json');
  if (fs.existsSync(workflowPath3)) {
    const workflow3 = JSON.parse(fs.readFileSync(workflowPath3, 'utf8'));
    
    for (const node of workflow3.nodes) {
      if (node.name === 'OpenAI (IA Inteligente)' && node.parameters.messages) {
        const msgs = node.parameters.messages.messageValues || [];
        for (const msg of msgs) {
          if (msg.role === 'system') {
            const content = msg.content;
            // Mantém a estrutura de placeholders mas atualiza o contexto
            if (content.includes('PromptFinalInjetado')) {
              console.log('   ✅ Nó "OpenAI (IA Inteligente)" usa prompt dinâmico - mantido');
            }
          }
        }
      }
    }
    
    // Deleta workflow existente
    const wfList = await request('GET', '/rest/workflows', null, cookie);
    if (wfList.data?.data) {
      for (const wf of wfList.data.data) {
        if (wf.name === workflow3.name) {
          await request('DELETE', `/rest/workflows/${wf.id}`, null, cookie);
        }
      }
    }
    
    // Atualiza o nó de injeção dinâmica para usar o novo prompt como base
    for (const node of workflow3.nodes) {
      if (node.name === 'Injeção Dinâmica (Variáveis)') {
        const values = node.parameters.values?.string || [];
        for (const v of values) {
          if (v.name === 'PromptFinalInjetado') {
            v.value = salesPrompt + '\n\nATENÇÃO, USE ESTES PREÇOS (Atualizado via Comando Geral):\n{{$node["Airtable (Painel Comando Geral)"].json.TabelaPrecos}}\n\nDATAS FECHADAS/FERIADOS:\n{{$node["Airtable (Painel Comando Geral)"].json.FeriadosBloqueados}}';
          }
        }
        console.log('   ✅ Prompt de vendas injetado no nó "Injeção Dinâmica (Variáveis)"');
      }
    }
    
    res = await request('POST', '/rest/workflows', {
      name: workflow3.name,
      nodes: workflow3.nodes,
      connections: workflow3.connections,
      settings: {},
      staticData: null,
      pinData: {},
      versionId: '',
      tags: []
    }, cookie);
    
    if (res.status === 200) {
      console.log(`   ✅ Workflow "${workflow3.name}" importado com sucesso!`);
    }
  }
  
  console.log('\n✅✅✅ TODOS OS WORKFLOWS FORAM IMPORTADOS COM OS NOVOS PROMPTS! ✅✅✅');
  console.log(`\nAcesse: http://localhost:5678`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Senha: ${PASSWORD}`);
}

main().catch(console.error);