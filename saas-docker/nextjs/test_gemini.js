const https = require('https');
const data = JSON.stringify({
  model: "gemini-1.5-flash",
  messages: [{ role: "user", content: "Hello" }]
});

const req = https.request('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer AIzaSyBMjG5IShHYgs06SkRmKsQDiIgqy2rc5jU',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
