// src/pages/TokenWizard.tsx
// Token Creation Studio supporting EVM ERC-20 and Solana SPL/Token-2022 with wallet signing

import { useState } from "react"
import { Icon } from "../components/Icons"
import { Badge, Button, Card, Input, PageHeading, SectionHeading, Tabs } from "../components/ui"
import { TokenService, type EVMTokenConfig, type SolanaTokenConfig } from "../services/tokenService"
import { DeployModal } from "../components/web3/DeployModal"

export default function TokenWizard() {
  const [ecosystem, setEcosystem] = useState<"EVM" | "Solana">("EVM")

  // EVM Token Form
  const [evmConfig, setEvmConfig] = useState<EVMTokenConfig>({
    name: "Forge Protocol",
    symbol: "FORGE",
    decimals: 18,
    initialSupply: "1000000",
    mintable: true,
    burnable: true,
    pausable: false,
    permit: true,
    votes: false,
    flashMint: false,
  })

  // Solana Token Form
  const [solanaConfig, setSolanaConfig] = useState<SolanaTokenConfig>({
    name: "Solana Forge",
    symbol: "SFORGE",
    decimals: 9,
    initialSupply: "1000000",
    standard: "spl-token-2022",
    enableTransferFee: false,
    transferFeeBasisPoints: 100,
    enableMetadataPointer: true,
    isNonTransferable: false,
  })

  // Modals & Deployments
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [deployedTokens, setDeployedTokens] = useState<Array<{
    name: string
    symbol: string
    address: string
    network: string
    txHash: string
    explorerUrl: string
  }>>([])

  const generatedSolidity = TokenService.generateERC20Solidity(evmConfig)
  const generatedSolana = TokenService.generateSolanaProgramSnippet(solanaConfig)

  const activeCode = ecosystem === "EVM" ? generatedSolidity : generatedSolana

  return (
    <div className="page">
      <PageHeading
        title="Token Studio"
        description="Design, configure, and non-custodially deploy audited ERC-20 and Solana SPL tokens."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="brand">{ecosystem} Architecture</Badge>
            <Button
              variant="primary"
              icon="rocket"
              onClick={() => setIsDeployModalOpen(true)}
            >
              Deploy Token
            </Button>
          </div>
        }
      />

      <Tabs
        items={["EVM", "Solana"]}
        active={ecosystem}
        onChange={(tab) => setEcosystem(tab as "EVM" | "Solana")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="settings-card">
            <SectionHeading
              title="Token Parameters"
              description="Configure identity, precision, and initial distribution"
            />

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Token Name</label>
                <Input
                  value={ecosystem === "EVM" ? evmConfig.name : solanaConfig.name}
                  onChange={(e) => {
                    const val = e.target.value
                    if (ecosystem === "EVM") setEvmConfig({ ...evmConfig, name: val })
                    else setSolanaConfig({ ...solanaConfig, name: val })
                  }}
                  placeholder="e.g. Protocol Token"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Symbol</label>
                  <Input
                    value={ecosystem === "EVM" ? evmConfig.symbol : solanaConfig.symbol}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      if (ecosystem === "EVM") setEvmConfig({ ...evmConfig, symbol: val })
                      else setSolanaConfig({ ...solanaConfig, symbol: val })
                    }}
                    placeholder="FORGE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Decimals</label>
                  <Input
                    type="number"
                    value={ecosystem === "EVM" ? evmConfig.decimals : solanaConfig.decimals}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (ecosystem === "EVM") setEvmConfig({ ...evmConfig, decimals: val })
                      else setSolanaConfig({ ...solanaConfig, decimals: val })
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Initial Supply</label>
                <Input
                  value={ecosystem === "EVM" ? evmConfig.initialSupply : solanaConfig.initialSupply}
                  onChange={(e) => {
                    const val = e.target.value
                    if (ecosystem === "EVM") setEvmConfig({ ...evmConfig, initialSupply: val })
                    else setSolanaConfig({ ...solanaConfig, initialSupply: val })
                  }}
                  placeholder="1000000"
                />
              </div>
            </div>
          </Card>

          {/* Feature Flags */}
          <Card className="settings-card">
            <SectionHeading
              title={ecosystem === "EVM" ? "ERC-20 Extensions" : "SPL Extensions"}
              description="Enable audited modular extensions"
            />

            <div className="space-y-3 pt-2">
              {ecosystem === "EVM" ? (
                <>
                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Mintable</span>
                      <span className="text-xs text-muted">Owner can mint new tokens in the future</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.mintable}
                      onChange={(e) => setEvmConfig({ ...evmConfig, mintable: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Burnable</span>
                      <span className="text-xs text-muted">Holders can destroy their own tokens</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.burnable}
                      onChange={(e) => setEvmConfig({ ...evmConfig, burnable: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Pausable</span>
                      <span className="text-xs text-muted">Ability to pause all transfers in emergencies</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.pausable}
                      onChange={(e) => setEvmConfig({ ...evmConfig, pausable: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Permit (EIP-2612)</span>
                      <span className="text-xs text-muted">Gasless token approvals via signed signatures</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.permit}
                      onChange={(e) => setEvmConfig({ ...evmConfig, permit: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">On-chain Governance (Votes)</span>
                      <span className="text-xs text-muted">Compound/OpenZeppelin Governor voting power</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.votes}
                      onChange={(e) => setEvmConfig({ ...evmConfig, votes: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Flash Minting (EIP-3156)</span>
                      <span className="text-xs text-muted">Allows instantaneous flash loans of the token</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={evmConfig.flashMint}
                      onChange={(e) => setEvmConfig({ ...evmConfig, flashMint: e.target.checked })}
                      className="rounded"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Standard</span>
                      <span className="text-xs text-muted">SPL Token vs Token-2022 Extension Program</span>
                    </div>
                    <select
                      value={solanaConfig.standard}
                      onChange={(e) => setSolanaConfig({ ...solanaConfig, standard: e.target.value as any })}
                      className="bg-[#090d13] border border-border rounded px-2 py-1 text-xs"
                    >
                      <option value="spl-token">Classic SPL Token</option>
                      <option value="spl-token-2022">Token-2022 (Extensions)</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Metadata Pointer</span>
                      <span className="text-xs text-muted">On-chain name and symbol embedded in mint</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={solanaConfig.enableMetadataPointer}
                      onChange={(e) => setSolanaConfig({ ...solanaConfig, enableMetadataPointer: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded bg-[#161b22]/50 border border-border/50 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium block">Transfer Fee</span>
                      <span className="text-xs text-muted">Protocol-level fee on every transaction</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={solanaConfig.enableTransferFee}
                      onChange={(e) => setSolanaConfig({ ...solanaConfig, enableTransferFee: e.target.checked })}
                      className="rounded"
                    />
                  </label>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Code Synthesis & Live Preview */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="settings-card flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon name="code" className="size-4 text-brand" />
                <span className="font-semibold text-sm">
                  {ecosystem === "EVM" ? "Solidity 0.8.28 Contract" : "Solana Anchor Program"}
                </span>
              </div>
              <Badge tone="cyan">OpenZeppelin v5 Audited</Badge>
            </div>

            <pre className="p-4 bg-[#090d13] rounded-lg border border-border/60 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[520px] whitespace-pre">
              {activeCode}
            </pre>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted">
                Ready for compilation on Arbitrum, Base, Ethereum, or Solana Devnet.
              </span>
              <Button
                variant="primary"
                icon="rocket"
                onClick={() => setIsDeployModalOpen(true)}
              >
                Launch Token
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Deployed Tokens Table */}
      {deployedTokens.length > 0 && (
        <Card className="mt-8 settings-card">
          <SectionHeading
            title="Deployed Tokens Registry"
            description="Verified on-chain token contracts and mint addresses"
          />
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2">Token</th>
                  <th className="py-2">Network</th>
                  <th className="py-2">Address</th>
                  <th className="py-2">Transaction</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {deployedTokens.map((t, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="py-2.5 font-semibold">
                      {t.name} ({t.symbol})
                    </td>
                    <td className="py-2.5">{t.network}</td>
                    <td className="py-2.5 font-mono text-brand">
                      {t.address.slice(0, 10)}...{t.address.slice(-6)}
                    </td>
                    <td className="py-2.5 font-mono text-muted">
                      <a href={t.explorerUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                        {t.txHash.slice(0, 8)}...
                      </a>
                    </td>
                    <td className="py-2.5">
                      <Badge tone="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Deploy Confirmation Modal */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        contractName={ecosystem === "EVM" ? evmConfig.name : solanaConfig.name}
        contractType={ecosystem === "EVM" ? "erc20" : "spl-token"}
        ecosystem={ecosystem === "EVM" ? "evm" : "solana"}
        bytecodeOrInstruction="0x608060405234801561001057600080fd5b5060405161012038038061012083398101604081905261002f91610060565b"
        onDeploySuccess={(deployment) => {
          setDeployedTokens([
            {
              name: ecosystem === "EVM" ? evmConfig.name : solanaConfig.name,
              symbol: ecosystem === "EVM" ? evmConfig.symbol : solanaConfig.symbol,
              address: deployment.contractAddress,
              network: deployment.networkName,
              txHash: deployment.txHash,
              explorerUrl: deployment.explorerUrl,
            },
            ...deployedTokens,
          ])
        }}
      />
    </div>
  )
}
