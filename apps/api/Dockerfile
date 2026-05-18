# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace @games-night/api

COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --omit=dev --workspace @games-night/api

WORKDIR /app/apps/api
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
