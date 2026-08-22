FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads logs

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
