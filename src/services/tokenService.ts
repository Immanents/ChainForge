// src/services/tokenService.ts
// Token creation specifications, Solidity/Rust generators, and non-custodial deployment helpers

export type EVMTokenConfig = {
  name: string
  symbol: string
  decimals: number
  initialSupply: string
  maxSupply?: string
  mintable: boolean
  burnable: boolean
  pausable: boolean
  permit: boolean
  votes: boolean
  flashMint: boolean
}

export type SolanaTokenConfig = {
  name: string
  symbol: string
  decimals: number
  initialSupply: string
  standard: "spl-token" | "spl-token-2022"
  enableTransferFee?: boolean
  transferFeeBasisPoints?: number
  enableMetadataPointer?: boolean
  isNonTransferable?: boolean
}

export class TokenService {
  /**
   * Generates production-ready OpenZeppelin v5 Solidity code for the requested ERC-20 config
   */
  public static generateERC20Solidity(config: EVMTokenConfig): string {
    const imports: string[] = ['import "@openzeppelin/contracts/token/ERC20/ERC20.sol";']
    const inheritance: string[] = ["ERC20"]
    const constructorInits: string[] = [`ERC20("${config.name}", "${config.symbol}")`]

    if (config.burnable) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";')
      inheritance.push("ERC20Burnable")
    }

    if (config.pausable) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";')
      imports.push('import "@openzeppelin/contracts/access/Ownable2Step.sol";')
      inheritance.push("ERC20Pausable", "Ownable2Step")
      constructorInits.push("Ownable(initialOwner)")
    } else if (config.mintable) {
      imports.push('import "@openzeppelin/contracts/access/Ownable2Step.sol";')
      inheritance.push("Ownable2Step")
      constructorInits.push("Ownable(initialOwner)")
    }

    if (config.permit) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";')
      inheritance.push("ERC20Permit")
      constructorInits.push(`ERC20Permit("${config.name}")`)
    }

    if (config.votes) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";')
      inheritance.push("ERC20Votes")
    }

    if (config.flashMint) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";')
      inheritance.push("ERC20FlashMint")
    }

    // Deduplicate imports
    const uniqueImports = Array.from(new Set(imports)).join("\n")
    const contractInheritance = inheritance.join(", ")

    const className = config.name.replace(/[^a-zA-Z0-9]/g, "") || "ChainForgeToken"

    return `// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.28;

${uniqueImports}

/**
 * @title ${config.name} (${config.symbol})
 * @dev Synthesized via ChainForge AI Architecture Engine
 */
contract ${className} is ${contractInheritance} {
    constructor(address initialOwner)
        ${constructorInits.join("\n        ")}
    {
        _mint(initialOwner, ${config.initialSupply} * 10 ** decimals());
    }
${config.pausable ? `
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
` : ""}${config.mintable ? `
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
` : ""}${config.pausable || config.votes ? `
    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256 value)
        internal
        override(${inheritance.filter(i => ["ERC20", "ERC20Pausable", "ERC20Votes"].includes(i)).join(", ")})
    {
        super._update(from, to, value);
    }
` : ""}${config.votes ? `
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
` : ""}
}
`
  }

  /**
   * Generates Solana SPL / Token-2022 instruction documentation & Anchor snippet
   */
  public static generateSolanaProgramSnippet(config: SolanaTokenConfig): string {
    return `// Solana Token Program Configuration (${config.standard.toUpperCase()})
// Mint: ${config.name} ($${config.symbol})
// Decimals: ${config.decimals}
// Initial Supply: ${config.initialSupply}

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[program]
pub mod chainforge_token {
    use super::*;

    pub fn initialize_mint(ctx: Context<InitializeMint>) -> Result<()> {
        msg!("ChainForge Token Initialized: {}", "${config.symbol}");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = ${config.decimals},
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}
`
  }
}
