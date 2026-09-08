FROM node:20-slim
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["node", "dist/server.cjs"]

