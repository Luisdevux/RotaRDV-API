# Imagem base do Node.js para a versão 22
FROM node:22

# Instalar dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Instalar dependências do projeto
COPY package.json package-lock.json ./

# Instalar dependências usando npm ci para garantir uma instalação limpa
RUN npm ci

# Copiar o restante dos arquivos do projeto para o contêiner
COPY . .

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:local"]
