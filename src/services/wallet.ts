// src/services/wallet.ts
// Non-custodial multi-chain wallet connection and interaction service

import { EVM_NETWORKS, type EVMNetwork, SOLANA_CLUSTERS, type SolanaCluster } from "../config/networks"

export type WalletType = "evm" | "solana"

export type ConnectedWalletState = {
  type: WalletType
  address: string
  chainId?: number
  networkName?: string
  isTestnet?: boolean
  balance?: string
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
    solana?: {
      isPhantom?: boolean
      publicKey?: { toString: () => string; toBase58: () => string }
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      signTransaction?: (transaction: unknown) => Promise<unknown>
      signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>
      on?: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export class WalletService {
  private static evmListenerAdded = false
  private static solanaListenerAdded = false

  public static isEVMWalletAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.ethereum !== "undefined"
  }

  public static isSolanaWalletAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.solana !== "undefined"
  }

  public static async connectEVM(): Promise<ConnectedWalletState> {
    if (!this.isEVMWalletAvailable()) {
      throw new Error("No EVM wallet extension (e.g. MetaMask, Coinbase Wallet) detected in your browser.")
    }

    const accounts = (await window.ethereum!.request({
      method: "eth_requestAccounts",
    })) as string[]

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts authorized by user.")
    }

    const address = accounts[0]
    const chainIdHex = (await window.ethereum!.request({
      method: "eth_chainId",
    })) as string

    const chainId = parseInt(chainIdHex, 16)
    const network = EVM_NETWORKS[chainId]

    let balanceFormatted = "0.00"
    try {
      const balanceHex = (await window.ethereum!.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string
      const wei = BigInt(balanceHex)
      const eth = Number(wei) / 1e18
      balanceFormatted = eth.toFixed(4)
    } catch {
      // ignore balance error
    }

    return {
      type: "evm",
      address,
      chainId,
      networkName: network ? network.name : `Chain ID: ${chainId}`,
      isTestnet: network ? network.isTestnet : true,
      balance: `${balanceFormatted} ${network?.currency || "ETH"}`,
    }
  }

  public static async switchEVMNetwork(targetChainId: number): Promise<void> {
    if (!this.isEVMWalletAvailable()) throw new Error("No EVM wallet detected")

    const hexChainId = "0x" + targetChainId.toString(16)
    try {
      await window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      })
    } catch (switchError: unknown) {
      const err = switchError as { code?: number; message?: string }
      // Error 4902: Unrecognized chain, request addition
      if (err.code === 4902) {
        const net = EVM_NETWORKS[targetChainId]
        if (net) {
          await window.ethereum!.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: net.name,
                rpcUrls: [net.rpcUrl],
                nativeCurrency: {
                  name: net.currency,
                  symbol: net.currency,
                  decimals: 18,
                },
                blockExplorerUrls: [net.explorerUrl],
              },
            ],
          })
        } else {
          throw new Error(`Chain ${targetChainId} not found in supported networks`)
        }
      } else {
        throw switchError
      }
    }
  }

  public static async connectSolana(): Promise<ConnectedWalletState> {
    if (!this.isSolanaWalletAvailable()) {
      throw new Error("No Solana wallet extension (e.g. Phantom, Solflare) detected in your browser.")
    }

    const resp = await window.solana!.connect()
    const address = resp.publicKey.toString()

    return {
      type: "solana",
      address,
      networkName: "Solana Devnet",
      isTestnet: true,
      balance: "Available via RPC",
    }
  }

  public static async sendEVMDeploymentTransaction(
    deployerAddress: string,
    bytecodeWithArgs: `0x${string}`,
  ): Promise<string> {
    if (!this.isEVMWalletAvailable()) throw new Error("No EVM wallet detected")

    const txHash = (await window.ethereum!.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: deployerAddress,
          data: bytecodeWithArgs,
        },
      ],
    })) as string

    return txHash
  }

  public static async waitForEVMTransactionReceipt(txHash: string): Promise<{
    status: "0x1" | "0x0"
    contractAddress: string | null
  }> {
    if (!this.isEVMWalletAvailable()) throw new Error("No EVM wallet detected")

    const maxAttempts = 30
    for (let i = 0; i < maxAttempts; i++) {
      const receipt = (await window.ethereum!.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      })) as { status?: string; contractAddress?: string } | null

      if (receipt && receipt.status) {
        return {
          status: receipt.status === "0x1" ? "0x1" : "0x0",
          contractAddress: receipt.contractAddress || null,
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    throw new Error("Transaction is taking longer than expected to confirm. Please check your block explorer.")
  }
}
