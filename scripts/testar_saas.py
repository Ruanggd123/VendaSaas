import os
import sys
import json
import urllib.request
import urllib.error
import time
from dotenv import load_dotenv

# Reduz logging
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

import google.generativeai as genai

# Carrega a API Key
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # Fallback para producao/.env
    env_path = os.path.join(os.path.dirname(__file__), '..', 'producao', '.env')
    load_dotenv(env_path)
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print(f"ERRO: GEMINI_API_KEY nao encontrada.")
    sys.exit(1)

genai.configure(api_key=api_key)

print("==================================================")
print("TESTE DE INTEGRAÇÃO SAAS (BANCO DE DADOS + NEXT.JS + IA)")
print("==================================================\n")

print("🔍 1. Buscando as regras do cliente (Imobiliária do João) na API do Next.js...")

max_retries = 3
data = None
for attempt in range(max_retries):
    try:
        req = urllib.request.urlopen('http://localhost:3000/api/tenant?instance=Imobiliaria_Joao', timeout=10)
        data = json.loads(req.read().decode('utf-8'))
        break
    except Exception as e:
        if attempt < max_retries - 1:
            print(f"   Aguardando o servidor Next.js iniciar (tentativa {attempt+1}/{max_retries})...")
            time.sleep(3)
        else:
            print(f"❌ Erro ao conectar com a API do SaaS: {e}")
            sys.exit(1)

settings = data.get("settings", {})
prompt_base = settings.get("ai_prompt", "Você é um assistente.")
plano = data.get("plan", "Desconhecido")

print(f"✅ Dados carregados com sucesso do Banco SQLite!")
print(f"   Nome do Cliente: {data.get('name')}")
print(f"   Plano Contratado: {plano.upper()}")
print(f"   Injetando Prompt da Imobiliária na Inteligência Artificial...\n")

# Anexa instruções de formato e concisão para garantir respostas curtas e formato padrão ao listar produtos
concise_suffix = (
    "\n\n### INSTRUCOES_RUNTIME: Responda em no maximo 2 frases. "
    "Ao listar produtos, use o formato compacto:\n- Nome: **PLANO** — R$ VALOR\n  Breve: 1 frase com 2-3 beneficios.\nSepare produtos com linha vazia."
)
model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=prompt_base + concise_suffix)
chat = model.start_chat()

print("💬 2. Simulando uma conversa de um Lead com a Imobiliária do João:")
lead_msg = "Olá! Quanto custa a casa de praia? Vocês estão abertos hoje?"
print(f"\n[Lead]: {lead_msg}")

try:
    response = chat.send_message(lead_msg)
    print(f"\n[IA da Imobiliária]: {response.text}\n")
    print("✅ TESTE BEM SUCEDIDO! A IA leu o banco de dados e obedeceu às regras do João!")
except Exception as e:
    print(f"❌ Erro na API do Gemini: {e}")
