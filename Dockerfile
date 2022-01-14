FROM node:16.13.1-alpine3.15

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate && npx prisma migrate dev --name init && npm run build

CMD ["npm", "run", "serve"]
