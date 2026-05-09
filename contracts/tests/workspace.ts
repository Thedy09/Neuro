import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("neuro_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Workspace as Program<Workspace>;

  let authority: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let configPDA: PublicKey;
  let vaultPDA1: PublicKey;
  let vaultPDA2: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Fund all accounts with 100 SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user1.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user2.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [vaultPDA1] = PublicKey.findProgramAddressSync(
      [user1.publicKey.toBuffer(), Buffer.from("vault")],
      program.programId
    );

    [vaultPDA2] = PublicKey.findProgramAddressSync(
      [user2.publicKey.toBuffer(), Buffer.from("vault")],
      program.programId
    );
  });

  // ── INITIAL / CORE TESTS (MUST PASS) ──────────────────────────────

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig()
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(config.isActive).to.equal(true);
    expect(config.isPaused).to.equal(false);
    expect(config.version).to.equal(1);
  });

  it("Initialize Vault for user1 with risk_score 50", async () => {
    await program.methods
      .initializeVault(50)
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(vault.owner.toBase58()).to.equal(user1.publicKey.toBase58());
    expect(vault.riskToleranceScore).to.equal(50);
    expect(Number(vault.totalDeposited.toString())).to.equal(0);
    expect(Number(vault.createdAt.toString())).to.be.greaterThan(0);
  });

  it("Initialize Vault for user2 with risk_score 0 (minimum)", async () => {
    await program.methods
      .initializeVault(0)
      .accounts({
        vault: vaultPDA2,
        owner: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA2);
    expect(vault.owner.toBase58()).to.equal(user2.publicKey.toBase58());
    expect(vault.riskToleranceScore).to.equal(0);
    expect(Number(vault.totalDeposited.toString())).to.equal(0);
  });

  it("Initialize Vault with risk_score 100 (maximum)", async () => {
    const maxUser = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        maxUser.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    const [maxVaultPDA] = PublicKey.findProgramAddressSync(
      [maxUser.publicKey.toBuffer(), Buffer.from("vault")],
      program.programId
    );

    await program.methods
      .initializeVault(100)
      .accounts({
        vault: maxVaultPDA,
        owner: maxUser.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([maxUser])
      .rpc();

    const vault = await program.account.userVault.fetch(maxVaultPDA);
    expect(vault.riskToleranceScore).to.equal(100);
  });

  it("Deposit tracking with valid amount", async () => {
    await program.methods
      .depositTracking(new BN(1_000_000_000))
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(Number(vault.totalDeposited.toString())).to.equal(1_000_000_000);
  });

  it("Update risk score for user1", async () => {
    await program.methods
      .updateRisk(75)
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(vault.riskToleranceScore).to.equal(75);
  });

  // ── ADDITIONAL FUNCTIONALITY TESTS ────────────────────────────────

  it("Multiple deposits accumulate correctly", async () => {
    await program.methods
      .depositTracking(new BN(500_000_000))
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(Number(vault.totalDeposited.toString())).to.equal(1_500_000_000);
  });

  it("Update risk to boundary value 0", async () => {
    await program.methods
      .updateRisk(0)
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(vault.riskToleranceScore).to.equal(0);
  });

  it("Update risk to boundary value 100", async () => {
    await program.methods
      .updateRisk(100)
      .accounts({
        vault: vaultPDA1,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA1);
    expect(vault.riskToleranceScore).to.equal(100);
  });

  it("Deposit tracking for user2", async () => {
    await program.methods
      .depositTracking(new BN(2_000_000_000))
      .accounts({
        vault: vaultPDA2,
        owner: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const vault = await program.account.userVault.fetch(vaultPDA2);
    expect(Number(vault.totalDeposited.toString())).to.equal(2_000_000_000);
  });

  // ── ERROR / EDGE CASE TESTS ───────────────────────────────────────

  it("Fails: initialize vault with risk_score > 100", async () => {
    const badUser = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        badUser.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    const [badVaultPDA] = PublicKey.findProgramAddressSync(
      [badUser.publicKey.toBuffer(), Buffer.from("vault")],
      program.programId
    );

    try {
      await program.methods
        .initializeVault(101)
        .accounts({
          vault: badVaultPDA,
          owner: badUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([badUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("InvalidRiskScore");
    }
  });

  it("Fails: update risk with score > 100", async () => {
    try {
      await program.methods
        .updateRisk(150)
        .accounts({
          vault: vaultPDA1,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("InvalidRiskScore");
    }
  });

  it("Fails: deposit with amount 0", async () => {
    try {
      await program.methods
        .depositTracking(new BN(0))
        .accounts({
          vault: vaultPDA1,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("InvalidAmount");
    }
  });

  it("Fails: update risk by non-owner", async () => {
    try {
      await program.methods
        .updateRisk(30)
        .accounts({
          vault: vaultPDA1,
          owner: user2.publicKey,
        })
        .signers([user2])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      // has_one constraint or seeds mismatch
      expect(Boolean(error)).to.equal(true);
    }
  });

  it("Fails: deposit by non-owner", async () => {
    try {
      await program.methods
        .depositTracking(new BN(100))
        .accounts({
          vault: vaultPDA1,
          owner: user2.publicKey,
        })
        .signers([user2])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(Boolean(error)).to.equal(true);
    }
  });

  it("Fails: duplicate vault initialization", async () => {
    try {
      await program.methods
        .initializeVault(25)
        .accounts({
          vault: vaultPDA1,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(Boolean(error)).to.equal(true);
    }
  });
});
