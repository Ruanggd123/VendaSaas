const fs = require('fs');
const http = require('http');

// Lê o workflow
const raw = fs.readFileSync('/backup/workflows/04_vendedor_ia_completo.json', 'utf8');
const wf = JSON.parse(raw);

// Prepara payload para a API
const payload = JSON.stringify({
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  active: false,
  settings: {}
});

const options = {
  hostname: 'localhost',
  port: 5678,
  path: '/rest/workflows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Workflow importado com sucesso!');
    } else {
      console.log('Resposta:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Erro:', e.message));
req.write(payload);
req.end();