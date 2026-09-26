FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Instala Chromium e dependências de fontes para suporte headless robusto no Render/Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --no-package-lock --ignore-scripts
COPY . .
EXPOSE 3000
CMD ["node", "--max-old-space-size=450", "dist/server.cjs"]
