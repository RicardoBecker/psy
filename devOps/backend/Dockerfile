FROM node:20-alpine

# Instalar dependências necessárias para o Prisma no Alpine
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar todas as dependências (incluindo dev)
RUN npm install

# Copiar código fonte
COPY . .

# Gerar cliente Prisma
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]