FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npx prisma migrate dev --name init && npm run build

CMD ["npm", "run", "serve"]
