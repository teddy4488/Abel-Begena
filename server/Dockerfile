FROM node:22-alpine

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .

# Increment to bust build cache
ARG CACHE_BUST=2
RUN node --max-old-space-size=1024 node_modules/.bin/nest build

EXPOSE 4001

CMD ["node", "dist/src/main"]
