FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Если внешний API включён, браузер обращается к нему через frontend
# same-origin proxy `/api`. Пустое значение сохраняет IndexedDB-режим проекта.
ARG VITE_DOCUMENTS_API_URL=
ENV VITE_DOCUMENTS_API_URL=$VITE_DOCUMENTS_API_URL

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
