# ChainForge AI — Subscription & Credit Model Specification

## 1. Plan Tiers & Entitlement Matrix

ChainForge AI offers four operational tiers tailored for individual developers, funded startups, and enterprise Web3 launchpads.

| Plan Dimension | Free Trial | Builder / Pro Monthly | Builder / Pro Yearly | Team / Agency | Enterprise |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Plan ID** | `trial` | `pro_monthly` | `pro_yearly` | `team_monthly` / `team_yearly` | `enterprise` |
| **Price (USD)** | **$0.00** | **$49.00 / mo** | **$488.00 / yr** *(17% savings)* | **$199.00 / mo** | Custom / Contact Sales |
| **Integer Minor Units** | `0` | `4900` | `48800` | `19900` | Custom |
| **Seat Limit** | 1 seat | 1 seat | 1 seat | 5 seats included | Unlimited |
| **Monthly Credit Grant** | 50 credits | 500 credits | 500 credits / mo | 2,500 credits / mo | Custom Pool (10,000+) |
| **AI Blueprint Synthesis** | Included | Included (Priority) | Included (Priority) | Included (High-Speed) | Dedicated Throughput |
| **Full Codebase Synthesis** | 1 project | Unlimited | Unlimited | Unlimited | Unlimited |
| **EVM Deployment** | Testnet only | Testnet + Mainnet | Testnet + Mainnet | Testnet + Mainnet | Multi-Chain + Private RPC |
| **Solana SPL / Program** | Devnet only | Devnet + Mainnet | Devnet + Mainnet | Devnet + Mainnet | Enterprise Solana RPC |
| **Growth & KOL Engine** | Read-Only Preview | Full Access | Full Access | Full Multi-Seat Access | Custom White-Label |
| **Support SLA** | Community | 24h Email | 24h Priority | 4h Priority Slack/Discord | Dedicated Account Manager |

---

## 2. Operation Cost Schedule

Every high-value AI synthesis or compilation operation requires compute credits metered by the `withCreditMetering` engine.

| Operation Code | Credit Cost | Description |
| :--- | :--- | :--- |
| `blueprint_synthesis` | **10 credits** | Multi-step interactive AI blueprint and architecture generation. |
| `blueprint_refinement`| **5 credits** | Granular feature alteration or tokenomics revision. |
| `codebase_generation` | **25 credits** | Full-stack scaffolding (Solidity/Anchor contracts, frontend, scripts). |
| `contract_compilation`| **15 credits** | Sandboxed bytecode compilation, ABI generation, and test execution. |
| `contract_audit`      | **20 credits** | AI automated vulnerability scan and security rule review. |
| `token_studio_mint`   | **10 credits** | ERC-20 / SPL token metadata generation, icon asset generation, and setup. |
| `growth_content_draft`| **2 credits**  | Social thread, technical blog, or announcement draft generation. |

---

## 3. Prepaid Credit Packages (Top-Ups)

Users on any active plan can purchase non-expiring prepaid credit packages without altering their subscription tier:

| Package ID | Credits Granted | Unit Price (USD) | Minor Units (USD Cents) | Effective Cost / Credit |
| :--- | :--- | :--- | :--- | :--- |
| `credits_100` | **100 credits** | **$10.00** | `1000` | $0.100 |
| `credits_500` | **500 credits** | **$45.00** *(10% bonus)* | `4500` | $0.090 |
| `credits_2500`| **2,500 credits**| **$199.00** *(20% bonus)* | `19900` | $0.079 |

---

## 4. Two-Phase Metering Lifecycle

```
    [Client Initiates Action]
               │
               ▼
   ┌───────────────────────┐
   │ Check Available Funds │ ──(Balance < Cost)──► [HTTP 402 Insufficient Credits]
   └───────────────────────┘
               │
          (Sufficient)
               ▼
   ┌───────────────────────┐
   │ reserve_user_credits  │ ──► [Locked in usage_events; credits_balance -= Cost]
   └───────────────────────┘
               │
       [Execute AI Work]
         /           \
     (Success)      (Error / Abort)
        /               \
       ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│commit_user_credits│  │release_user_credits│
└──────────────────┘  └──────────────────┘
       │                        │
  [Status: committed]      [Status: released]
  [Ledger Logged]          [Balance Restored]
```

### 4.1 Defenses Against Balance Tampering
1. **Database Constraint**: `CHECK (credits_balance >= 0)` guarantees that a user profile cannot drop below zero credits under any concurrent load.
2. **Row Locking**: `SELECT ... FOR UPDATE` serializes concurrent debit operations, completely eliminating race conditions.
3. **Idempotency Keys**: Both `reserve_user_credits` and `deduct_user_credits` require client or server-generated UUID idempotent keys. If an operation is retried due to network drops, the database identifies the key and returns the initial reservation without double-billing.
