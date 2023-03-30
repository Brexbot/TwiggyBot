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
USER twiggy

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

CMD ["npm", "run", "migrate:serve"]
