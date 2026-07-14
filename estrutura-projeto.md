# Estrutura do Projeto

## Arquivos Raiz

### .gitignore
- Especifica quais arquivos/pastas devem ser ignorados pelo Git
  - Ignora arquivos .env e pastas .aider*

### package.json
- Configurações e dependências do projeto
  - Scripts:
    - dev: Inicia servidor de desenvolvimento
    - build: Compila projeto para produção
    - start: Inicia servidor em produção
  - Dependências principais:
    - next: Framework Next.js
    - react: Biblioteca React
    - framer-motion: Para animações
    - @next/font: Para gerenciamento de fontes
  - Dev Dependencies:
    - tailwindcss: Framework CSS
    - postcss: Processador CSS
    - autoprefixer: Adiciona prefixos CSS

## Pastas Principais

### node_modules/
- Contém todas as dependências do projeto (não versionado)

## Tecnologias Utilizadas

- Next.js 16.2.10
- React 19.2.7
- Tailwind CSS 4.3.2
- Framer Motion 12.42.2
