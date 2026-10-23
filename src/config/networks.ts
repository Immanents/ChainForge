// src/config/networks.ts
// EVM networks and Solana cluster definitions with RPC endpoints, chain IDs, and block explorers

export type EVMNetwork = {
  id: number
  name: string
  shortName: string
  currency: string
  rpcUrl: string
  explorerUrl: string
  isTestnet: boolean
}

export type SolanaCluster = {
  id: "devnet" | "mainnet-beta" | "testnet"
  name: string
  endpoint: string
  explorerUrl: string
  isTestnet: boolean
}

export const EVM_NETWORKS: Record<number, EVMNetwork> = {
  // Ethereum
  1: {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "ETH",
    currency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  },
  11155111: {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    currency: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  // Base
  8453: {
    id: 8453,
    name: "Base Mainnet",
    shortName: "Base",
    currency: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    isTestnet: false,
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    shortName: "Base Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    isTestnet: true,
  },
  // Arbitrum
  42161: {
    id: 42161,
    name: "Arbitrum One",
    shortName: "Arbitrum",
    currency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    isTestnet: false,
  },
  421614: {
    id: 421614,
    name: "Arbitrum Sepolia",
    shortName: "Arb Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    isTestnet: true,
  },
  // Polygon
  137: {
    id: 137,
    name: "Polygon Mainnet",
    shortName: "Polygon",
    currency: "POL",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    shortName: "Amoy",
    currency: "POL",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    isTestnet: true,
  },
  // BNB Chain
  56: {
    id: 56,
    name: "BNB Smart Chain",
    shortName: "BNB",
    currency: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    isTestnet: false,
  },
  97: {
    id: 97,
    name: "BNB Testnet",
    shortName: "BNB Testnet",
    currency: "tBNB",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorerUrl: "https://testnet.bscscan.com",
    isTestnet: true,
  },
}

export const SOLANA_CLUSTERS: Record<string, SolanaCluster> = {
  devnet: {
    id: "devnet",
    name: "Solana Devnet",
    endpoint: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    isTestnet: true,
  },
  "mainnet-beta": {
    id: "mainnet-beta",
    name: "Solana Mainnet-Beta",
    endpoint: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com",
    isTestnet: false,
  },
}
