FROM node:22-alpine

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 4001

CMD ["node", "dist/main"]
