import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def gerar_pesos_cliente():
    print("="*60)
    print("GERADOR AUTOMÁTICO DE 'PESOS' (PROMPTS) PARA NOVOS CLIENTES")
    print("="*60)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERRO] Chave da API não encontrada no arquivo .env!")
        return

    # Coleta de informações básicas (sem esforço)
    print("\nPreencha os dados básicos do seu novo cliente para eu criar o cérebro da IA dele:")
    nome_empresa = input("1. Nome da Empresa (ex: Clínica Sorriso): ")
    nicho = input("2. Ramo/Nicho (ex: Dentista): ")
    servico_principal = input("3. Serviço principal e preço (ex: Clareamento R$ 500): ")
    regras = input("4. Regras especiais (ex: Só agenda de tarde, fecha final de semana): ")
    
    print("\n[🤖] A Inteligência Artificial está gerando o Prompt Mestre (Pesos)... Aguarde!")
    
    client = genai.Client(api_key=api_key)
    
    # Prompt que ensina a IA a gerar outros Prompts (Metaprompt)
    meta_prompt = f"""
    Você é um Engenheiro de Prompts especialista em Inteligência Artificial para Atendimento no WhatsApp.
    Crie o "Prompt de Sistema" (os pesos e regras de comportamento) para a IA que vai atender os clientes desta empresa.
    
    DADOS DA EMPRESA:
    - Nome: {nome_empresa}
    - Nicho: {nicho}
    - Serviços e Preços: {servico_principal}
    - Regras Especiais: {regras}
    
    O prompt gerado DEVE:
    1. Instruir a IA a ser amigável e usar mensagens muito curtas (padrão WhatsApp).
    2. Nunca inventar informações que não estão no prompt.
    3. Tentar agendar o cliente ou tirar a dúvida baseada nos serviços acima.
    4. Estar pronto para o desenvolvedor simplesmente COPIAR e COLAR no banco de dados.
    
    Não coloque explicações, devolva APENAS o texto do prompt gerado.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=meta_prompt
        )
        
        print("\n" + "="*60)
        print("✅ PROMPT GERADO COM SUCESSO! COPIE E COLE NO SEU AIRTABLE:")
        print("="*60 + "\n")
        print(response.text)
        print("\n" + "="*60)
        
        # Opcional: Salvar em um arquivo de texto
        filename = f"prompt_{nome_empresa.replace(' ', '_').lower()}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"O prompt também foi salvo no arquivo: scripts/{filename}")
        
    except Exception as e:
        print(f"Erro ao gerar: {e}")

if __name__ == "__main__":
    # Garante que o script acha o .env na pasta de cima
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(os.path.dirname(script_dir)) 
    gerar_pesos_cliente()
