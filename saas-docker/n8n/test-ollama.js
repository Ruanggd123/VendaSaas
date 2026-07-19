const http = require('http');

const data = JSON.stringify({
  model: "llama3.1:latest",
  messages: [{"role": "user", "content": "responda apenas sim"}],
  stream: false
});

const req = http.request({
  hostname: "ollama",
  port: 11434,
  path: "/api/chat",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let d = "";
  res.on("data", c => d += c);
  res.on("end", () => console.log(d.substring(0, 300)));
});

req.write(data);
req.end();