export type ProjectRecord = {
  id: string
  name: string
  description: string
  website: string
  category: string
  audience: string
  status: "Production" | "Testnet" | "Pre-launch"
  tokenSymbol: string
  createdAt: string
}

export const defaultProject: ProjectRecord = {
  id: "nova-protocol",
  name: "Nova Protocol",
  description:
    "Nova is a cross-chain intent protocol that makes complex onchain actions feel simple for users and developers.",
  website: "https://novaprotocol.xyz",
  category: "Infrastructure",
  audience: "Web3 developers, DeFi users, infrastructure teams",
  status: "Production",
  tokenSymbol: "NOVA",
  createdAt: "2025-02-14T00:00:00.000Z",
}

export function exportProject(project: ProjectRecord) {
  const payload = {
    schemaVersion: "1.0",
    exportedAt: new Date().toISOString(),
    product: "ChainForge",
    project,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-chainforge.json`
  link.click()
  URL.revokeObjectURL(url)
}
