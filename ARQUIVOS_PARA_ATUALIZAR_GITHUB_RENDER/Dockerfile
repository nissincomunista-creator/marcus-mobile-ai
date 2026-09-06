FROM node:20-slim
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]

