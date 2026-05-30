FROM rust:1.75-slim as builder
WORKDIR /app
COPY backend/Cargo.toml backend/src ./backend/
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/council /usr/local/bin/
CMD ["council"]