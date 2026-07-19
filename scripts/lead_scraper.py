import requests
from bs4 import BeautifulSoup
import re
import pandas as pd
from googlesearch import search
import time

def find_phone_numbers(url):
    """Extrai números de telefone (formato BR) de uma página web."""
    try:
        # User-Agent para evitar bloqueios simples
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        
        # Regex para tentar capturar telefones fixos e celulares no formato BR
        # Exemplos: (11) 99999-9999, 11 99999 9999, +55 11 99999-9999
        phone_pattern = re.compile(r'(?:\+?55\s?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}')
        
        matches = phone_pattern.findall(text)
        
        # Limpar os números encontrados e remover duplicatas
        clean_numbers = set()
        for match in matches:
            clean_num = re.sub(r'[^\d]', '', match)
            if len(clean_num) >= 10 and len(clean_num) <= 13: # Considerando DDD + Número
                clean_numbers.add(clean_num)
                
        return list(clean_numbers) if clean_numbers else None
        
    except Exception as e:
        print(f"Erro ao acessar {url}: {e}")
        return None

def scrape_leads(niche, location, num_results=10):
    """Busca leads baseado no nicho e localização."""
    query = f'"{niche}" "{location}" contato'
    print(f"Buscando por: {query}")
    
    leads = []
    
    try:
        # Faz a busca no Google
        for j in search(query, num=num_results, stop=num_results, pause=2):
            print(f"Analisando site: {j}")
            
            # Evitar grandes portais e focar nos sites das próprias empresas
            if any(domain in j for domain in ['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'jusbrasil', 'reclameaqui']):
                print(" -> Ignorando rede social/portal.")
                continue
                
            phones = find_phone_numbers(j)
            
            if phones:
                print(f" -> Telefones encontrados: {phones}")
                leads.append({
                    'Site': j,
                    'Telefones': ', '.join(phones),
                    'Nicho': niche,
                    'Localizacao': location
                })
            else:
                print(" -> Nenhum telefone encontrado.")
                
            time.sleep(1) # Pausa amigável
            
    except Exception as e:
        print(f"Erro na busca: {e}")
        
    return leads

if __name__ == "__main__":
    print("=== MÁQUINA DE VENDAS - SCRAPER DE LEADS ===")
    
    # Você pode alterar o nicho e localização aqui para focar no seu público ideal
    nicho = input("Digite o nicho (ex: Clínicas de Estética): ") or "Clínicas de Estética"
    localizacao = input("Digite a localização (ex: São Paulo): ") or "São Paulo"
    quantidade = int(input("Quantidade de sites para analisar (ex: 15): ") or "15")
    
    print("\nIniciando raspagem de dados. Isso pode levar alguns minutos...")
    
    leads_encontrados = scrape_leads(nicho, localizacao, quantidade)
    
    if leads_encontrados:
        df = pd.DataFrame(leads_encontrados)
        filename = f"leads_{nicho.replace(' ', '_').lower()}.csv"
        
        # Salvar em CSV para importar no HubSpot ou n8n depois
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"\nSucesso! Foram encontrados {len(leads_encontrados)} leads com telefone.")
        print(f"Arquivo salvo como: {filename}")
    else:
        print("\nNenhum lead com telefone foi encontrado. Tente outros termos.")
