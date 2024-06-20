# syntax=docker/dockerfile:1
FROM node:lts-alpine3.17 as builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npm run build && npx prisma generate

FROM node:lts-alpine3.17

WORKDIR /app

RUN addgroup -S twiggy && adduser -S twiggy -G twiggy

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma/database.empty ./prisma/db/main.db

RUN chown -R twiggy:twiggy /app/prisma/db /app/assets/NFD/images

USER twiggy

CMD ["npm", "run", "migrate:serve"]
