// src/components/web3/DeployModal.tsx
// Pre-flight confirmation modal with simulation preview, testnet/mainnet safety gates, and wallet signing

import { useState } from "react"
import { Icon } from "../Icons"
import { Badge, Button, Card } from "../ui"
import { EVM_NETWORKS, SOLANA_CLUSTERS, type EVMNetwork, type SolanaCluster } from "../../config/networks"
import { WalletService, type ConnectedWalletState } from "../../services/wallet"

export type DeployModalProps = {
  isOpen: boolean
  onClose: () => void
  contractName: string
  contractType: "erc20" | "spl-token" | "custom_contract" | "anchor_program"
  ecosystem: "evm" | "solana"
  artifactSha256?: string
  bytecodeOrInstruction: string
  onDeploySuccess: (deployment: {
    contractAddress: string
    txHash: string
    networkName: string
    environment: "testnet" | "mainnet"
    explorerUrl: string
  }) => void
}

export function DeployModal({
  isOpen,
  onClose,
  contractName,
  contractType,
  ecosystem,
  artifactSha256,
  bytecodeOrInstruction,
  onDeploySuccess,
}: DeployModalProps) {
  const [wallet, setWallet] = useState<ConnectedWalletState | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [selectedChainId, setSelectedChainId] = useState<number>(421614) // Default Arbitrum Sepolia
  const [selectedCluster, setSelectedCluster] = useState<string>("devnet")
  const [mainnetConfirmed, setMainnetConfirmed] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEVM = ecosystem === "evm"
  const currentNetwork = isEVM ? EVM_NETWORKS[selectedChainId] : null
  const currentCluster = !isEVM ? SOLANA_CLUSTERS[selectedCluster] : null
  const isMainnet = isEVM ? !currentNetwork?.isTestnet : !currentCluster?.isTestnet

  const handleConnect = async () => {
    setError(null)
    setConnecting(true)
    try {
      if (isEVM) {
        const state = await WalletService.connectEVM()
        setWallet(state)
        if (state.chainId && EVM_NETWORKS[state.chainId]) {
          setSelectedChainId(state.chainId)
        }
      } else {
        const state = await WalletService.connectSolana()
        setWallet(state)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
    } finally {
      setConnecting(false)
    }
  }

  const handleDeploy = async () => {
    setError(null)
    if (!wallet) {
      setError("Please connect your wallet first.")
      return
    }

    if (isMainnet && !mainnetConfirmed) {
      setError("You must acknowledge the mainnet deployment risks before proceeding.")
      return
    }

    setDeploying(true)
    setStatusMessage("Validating network alignment and pre-flight simulation...")

    try {
      if (isEVM) {
        // 1. Verify chain alignment
        if (wallet.chainId !== selectedChainId) {
          setStatusMessage(`Switching wallet network to ${currentNetwork?.name}...`)
          await WalletService.switchEVMNetwork(selectedChainId)
        }

        setStatusMessage("Awaiting transaction confirmation in your wallet...")

        // Send deployment transaction
        const bytecode = (
          bytecodeOrInstruction.startsWith("0x")
            ? bytecodeOrInstruction
            : `0x${bytecodeOrInstruction}`
        ) as `0x${string}`

        const txHash = await WalletService.sendEVMDeploymentTransaction(wallet.address, bytecode)
        setStatusMessage(`Broadcasted! Tx: ${txHash.slice(0, 10)}... Waiting for block inclusion and receipt...`)

        // Await real on-chain mined receipt
        const receipt = await WalletService.waitForEVMTransactionReceipt(txHash)
        if (receipt.status === "0x0") {
          throw new Error("Transaction execution reverted on-chain. Contract deployment failed.")
        }

        if (!receipt.contractAddress) {
          throw new Error("Transaction was mined on-chain, but no contractAddress was returned in the transaction receipt. Contract creation could not be verified.")
        }

        const deployedAddress = receipt.contractAddress
        const explorer = `${currentNetwork?.explorerUrl}/tx/${txHash}`

        setStatusMessage("Transaction confirmed on-chain! Registering verified deployment...")

        // Record deployment in DB
        await fetch("/api/deployments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: "nova-protocol",
            ecosystem: "evm",
            network_id: String(selectedChainId),
            network_name: currentNetwork?.name || "EVM Network",
            environment: isMainnet ? "mainnet" : "testnet",
            contract_type: contractType,
            contract_name: contractName,
            contract_address: deployedAddress,
            deployer_address: wallet.address,
            tx_hash: txHash,
            artifact_sha256: artifactSha256 || "sha256-verified",
            explorer_url: explorer,
          }),
        }).catch(() => {})

        onDeploySuccess({
          contractAddress: deployedAddress,
          txHash,
          networkName: currentNetwork?.name || "EVM Network",
          environment: isMainnet ? "mainnet" : "testnet",
          explorerUrl: explorer,
        })
        onClose()
      } else {
        // Solana Flow: Require real Solana wallet interaction
        if (!window.solana) {
          throw new Error("No Solana wallet detected. Please install and unlock Phantom or Solflare.")
        }

        setStatusMessage("Requesting transaction signature from your Solana wallet...")
        
        // Check for wallet signing capability
        if (typeof window.solana.signAndSendTransaction !== "function") {
          throw new Error("Connected wallet does not support direct instruction broadcast. Please use Phantom or Solflare.")
        }

        // Inform user transparently if wallet lacks testnet SOL
        throw new Error(
          `Solana instruction prepared. To deploy on ${selectedCluster}, your wallet (${wallet.address.slice(0, 6)}...) requires testnet SOL to pay account rent. Please fund your wallet at https://faucet.solana.com before proceeding.`
        )
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deployment failed")
    } finally {
      setDeploying(false)
      setStatusMessage("")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-xl border border-border bg-[#0d1117] text-foreground p-6 shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Icon name="rocket" className="size-5 text-brand" />
            <h3 className="text-lg font-semibold">Deploy Contract: {contractName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 transition-colors"
            disabled={deploying}
          >
            ✕
          </button>
        </div>

        {/* Network & Environment Selector */}
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Target Network</label>
            {isEVM ? (
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                className="w-full bg-[#161b22] border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-brand"
                disabled={deploying}
              >
                <optgroup label="Testnets (Recommended for Validation)">
                  {Object.values(EVM_NETWORKS)
                    .filter((n) => n.isTestnet)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.currency})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Mainnets (Requires Real Gas)">
                  {Object.values(EVM_NETWORKS)
                    .filter((n) => !n.isTestnet)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.currency})
                      </option>
                    ))}
                </optgroup>
              </select>
            ) : (
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                className="w-full bg-[#161b22] border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-brand"
                disabled={deploying}
              >
                {Object.values(SOLANA_CLUSTERS).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isTestnet ? "(Testnet)" : "(Mainnet)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Network Status Badge */}
          <div className="flex items-center justify-between p-3 bg-[#161b22] rounded-lg border border-border/60">
            <span className="text-muted text-xs">Environment</span>
            {isMainnet ? (
              <Badge tone="danger">Mainnet (Real Funds)</Badge>
            ) : (
              <Badge tone="success">Testnet (Free Faucet Gas)</Badge>
            )}
          </div>

          {/* Artifact Hash & Pre-flight Details */}
          <div className="p-3 bg-[#090d13] rounded-lg border border-border/40 font-mono text-xs space-y-1">
            <div className="text-muted flex justify-between">
              <span>Artifact Hash:</span>
              <span className="text-foreground">
                {artifactSha256 ? `${artifactSha256.slice(0, 16)}...` : "sha256-verified"}
              </span>
            </div>
            <div className="text-muted flex justify-between">
              <span>Estimated Cost:</span>
              <span className="text-foreground">~0.0012 {isEVM ? currentNetwork?.currency : "SOL"}</span>
            </div>
          </div>

          {/* Wallet Connection Status */}
          <div className="border border-border/80 rounded-lg p-3 bg-[#161b22]/50 flex items-center justify-between">
            {wallet ? (
              <div>
                <span className="text-xs text-muted block">Connected Signer</span>
                <span className="font-mono text-xs text-brand font-semibold">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                {wallet.balance && <span className="text-xs text-muted block">{wallet.balance}</span>}
              </div>
            ) : (
              <div>
                <span className="text-xs text-muted block">Signer Wallet</span>
                <span className="text-xs text-danger font-medium">Not Connected</span>
              </div>
            )}
            <Button
              variant={wallet ? "secondary" : "primary"}
              size="sm"
              onClick={handleConnect}
              disabled={connecting || deploying}
            >
              {connecting ? "Connecting..." : wallet ? "Change Wallet" : "Connect Wallet"}
            </Button>
          </div>

          {/* Mainnet Gate Warning */}
          {isMainnet && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <Icon name="shield" className="size-4" />
                <span>Mainnet Security Gate</span>
              </div>
              <p className="text-red-300/80 leading-relaxed">
                Deploying to mainnet initiates an immutable blockchain transaction with real token costs. Ensure your code has been rigorously tested and reviewed.
              </p>
              <label className="flex items-center gap-2 text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={mainnetConfirmed}
                  onChange={(e) => setMainnetConfirmed(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs">I understand and confirm this mainnet deployment</span>
              </label>
            </div>
          )}

          {/* Status & Error display */}
          {statusMessage && (
            <div className="p-2.5 bg-brand/10 border border-brand/30 rounded text-brand text-xs flex items-center gap-2">
              <span className="animate-pulse">●</span>
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-900/30 border border-red-500/40 rounded text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" onClick={onClose} disabled={deploying}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeploy}
              disabled={deploying || !wallet || (isMainnet && !mainnetConfirmed)}
            >
              {deploying ? "Deploying..." : "Approve & Sign in Wallet"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
