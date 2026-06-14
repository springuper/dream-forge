# Build stage for frontend
FROM node:20-slim as frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Node.js build stage for backend
FROM node:20-slim as backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Runtime image
FROM node:20-slim
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/package*.json ./

# Copy skill files
COPY backend/skills ./skills

# Copy frontend dist
COPY --from=frontend-builder /app/dist ./dist

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]