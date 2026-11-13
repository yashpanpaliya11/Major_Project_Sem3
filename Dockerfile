FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN cd client && npm ci
RUN cd server && npm ci

COPY client ./client
COPY server ./server
RUN cd client && npm run build
RUN cd server && npx prisma generate

ENV NODE_ENV=production PORT=5001 SERVE_CLIENT=true
EXPOSE 5001
CMD ["sh", "-c", "cd server && npx prisma db push && node src/index.js"]
