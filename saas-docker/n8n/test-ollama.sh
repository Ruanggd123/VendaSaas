#!/bin/sh
curl -s -m 10 -X POST http://ollama:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.1:8b","messages":[{"role":"user","content":"responda apenas sim"}],"stream":false}'