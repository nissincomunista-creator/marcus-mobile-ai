FROM node:20-slim
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --no-package-lock --ignore-scripts
COPY . .
EXPOSE 3000
CMD ["node", "--max-old-space-size=450", "dist/server.cjs"]


