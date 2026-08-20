FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY migrations ./migrations
COPY src ./src

RUN mkdir -p /app/data/uploads && chown -R node:node /app

ENV NODE_ENV=production
EXPOSE 8787

USER node

CMD ["sh", "-c", "npm run db:migrate && npm start"]
