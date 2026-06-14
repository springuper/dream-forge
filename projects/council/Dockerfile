# Build stage for frontend
FROM node:20-slim as frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Rust build stage
FROM rust:1.75-slim as builder
WORKDIR /app

# Copy manifests
COPY backend/Cargo.toml backend/src ./

# Install certificates for HTTPS
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Build release
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy binary
COPY --from=builder /app/target/release/council /usr/local/bin/

# Copy skill files
COPY --from=builder /app/backend/skills /app/skills

# Copy frontend dist (from frontend build stage or local)
COPY --from=frontend-builder /app/dist ./dist

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["council"]