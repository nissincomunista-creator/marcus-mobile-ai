FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
