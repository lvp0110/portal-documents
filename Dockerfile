FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Браузер запрашивает документы портала через same-origin proxy `/api`.
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY server.js ./server.js

ENV NODE_ENV=production
ENV HTTP_PORT=3000

EXPOSE 3000

USER node
CMD ["node", "server.js"]
