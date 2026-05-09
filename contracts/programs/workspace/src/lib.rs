use anchor_lang::prelude::*;

declare_id!("E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT");

#[program]
pub mod neuro_vault {
    use super::*;

    // No initialize_config params needed from user beyond authority (auto-derived)
    // This is a global config PDA for the program
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.version = 1;
        Ok(())
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>, risk_score: u8) -> Result<()> {
        require!(risk_score <= 100, ErrorCode::InvalidRiskScore);

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.risk_tolerance_score = risk_score;
        vault.total_deposited = 0;
        vault.bump = ctx.bumps.vault;
        vault.created_at = Clock::get()?.unix_timestamp;

        emit!(VaultInitialized {
            owner: ctx.accounts.owner.key(),
            risk_score,
        });

        Ok(())
    }

    pub fn update_risk(ctx: Context<UpdateRisk>, new_score: u8) -> Result<()> {
        require!(new_score <= 100, ErrorCode::InvalidRiskScore);

        let vault = &mut ctx.accounts.vault;
        let old_score = vault.risk_tolerance_score;
        vault.risk_tolerance_score = new_score;

        emit!(RiskUpdated {
            owner: ctx.accounts.owner.key(),
            old_score,
            new_score,
        });

        Ok(())
    }

    pub fn deposit_tracking(ctx: Context<DepositTracking>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        emit!(DepositTracked {
            owner: ctx.accounts.owner.key(),
            amount,
            new_total: vault.total_deposited,
        });

        Ok(())
    }
}

// ── Global Config ──────────────────────────────────────────────────────

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 1;
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── User Vault Account ──────────────────────────────────────────────��─

#[account]
pub struct UserVault {
    pub owner: Pubkey,
    pub risk_tolerance_score: u8,
    pub total_deposited: u64,
    pub bump: u8,
    pub created_at: i64,
}

impl UserVault {
    pub const LEN: usize = 32 + 1 + 8 + 1 + 8;
}

// ── Context Structs ───────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        seeds = [owner.key().as_ref(), b"vault"],
        bump,
        payer = owner,
        space = 8 + UserVault::LEN,
    )]
    pub vault: Account<'info, UserVault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRisk<'info> {
    #[account(
        mut,
        seeds = [owner.key().as_ref(), b"vault"],
        bump = vault.bump,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, UserVault>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositTracking<'info> {
    #[account(
        mut,
        seeds = [owner.key().as_ref(), b"vault"],
        bump = vault.bump,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, UserVault>,
    pub owner: Signer<'info>,
}

// ── Events ────────────────────────────────────────────────────────────

#[event]
pub struct VaultInitialized {
    pub owner: Pubkey,
    pub risk_score: u8,
}

#[event]
pub struct RiskUpdated {
    pub owner: Pubkey,
    pub old_score: u8,
    pub new_score: u8,
}

#[event]
pub struct DepositTracked {
    pub owner: Pubkey,
    pub amount: u64,
    pub new_total: u64,
}

// ── Error Codes ──────────────────────────────────────────────────���────

#[error_code]
pub enum ErrorCode {
    #[msg("Risk score must be between 0 and 100")]
    InvalidRiskScore,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Not the vault owner")]
    Unauthorized,
}
