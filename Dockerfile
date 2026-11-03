FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
# Uploaded files live here. In Coolify, add a persistent storage mount for this path.
ENV STORAGE_DIR=/app/storage

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/storage

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
