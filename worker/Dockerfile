# worker/Dockerfile
# Sandboxed compilation & test runner for ChainForge AI
# Provides isolated toolchains for Solidity (Foundry) and Solana (Anchor)

FROM ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    python3 \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Install Rust & Cargo
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable

# Install Foundry (forge, cast, anvil)
RUN curl -L https://foundry.paradigm.xyz | bash \
    && /root/.foundry/bin/foundryup \
    && cp /root/.foundry/bin/* /usr/local/bin/

# Create unprivileged build user
RUN useradd -m -s /bin/bash sandboxuser
WORKDIR /home/sandboxuser/app

COPY package*.json ./
RUN npm install

COPY . .

# Run as unprivileged sandboxuser with no root or docker socket access
USER sandboxuser

ENTRYPOINT ["node", "dist/runner.js"]
