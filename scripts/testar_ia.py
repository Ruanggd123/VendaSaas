import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Carrega as variáveis de ambiente (chave API)
load_dotenv()

def iniciar_simulador():
    print("="*50)
    print("SIMULADOR DA IA DE VENDAS (WHATSAPP)")
    print("="*50)
    
    # Verifica se a chave da API existe no arquivo .env
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("\n[ERRO] Chave da API não encontrada!")
        return

    # Lê o prompt mestre
    try:
        with open("../config/ai_sales_prompt.txt", "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        print("Erro: Arquivo do prompt (ai_sales_prompt.txt) não encontrado.")
        return

    # Forçar instruções de formato e concisão (garante respostas curtas e formato de produtos)
    concise_instructions = (
        "\n\n### INSTRUCOES_RUNTIME: Responda em no maximo 2 frases. "
        "Ao listar produtos, retorne formato compacto:\n- Nome: **PLANO** — R$ VALOR\n  Breve: 1 frase com 2-3 beneficios.\nSepare produtos com linha vazia."
    )
    system_prompt = system_prompt + concise_instructions

    # Configura o Gemini com a nova biblioteca oficial
    client = genai.Client(api_key=api_key)
    
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.7
    )
    
    chat = client.chats.create(model="gemini-2.5-flash", config=config)
    
    print("\nSimulação Iniciada! Você é o cliente. Digite 'sair' para encerrar.")
    print("A IA fará a primeira abordagem. Pressione ENTER para começar...")
    input()
    
    # Primeira mensagem da IA fingindo que mandou uma mensagem fria/resposta
    resposta_inicial = chat.send_message("Faça a primeira abordagem para mim, que sou o dono de uma clínica estética. Seja breve, como no WhatsApp.")
    print(f"\n[IA Closer]: {resposta_inicial.text}")

    while True:
        mensagem_cliente = input("\n[Você - Cliente]: ")
        if mensagem_cliente.lower() == 'sair':
            break
            
        print("A IA está digitando...")
        time.sleep(1) # Simula o tempo de digitação no WhatsApp
        
        try:
            resposta_ia = chat.send_message(mensagem_cliente)
            print(f"\n[IA Closer]: {resposta_ia.text}")
        except Exception as e:
            print(f"\nErro ao se comunicar com a IA: {e}")

if __name__ == "__main__":
    # Garante que o script roda no diretório correto para achar o txt
    import sys
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    iniciar_simulador()
