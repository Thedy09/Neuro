import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Header } from "../src/components/Header";
import { useWalletStore } from "../src/store/walletStore";

const YIELD_OPS = [
  { protocol: "Jito", type: "Liquid Staking", apy: 7.1, risk: "Low", liquidity: 98 },
  { protocol: "Kamino", type: "USDC Vault", apy: 8.2, risk: "Low", liquidity: 95 },
  { protocol: "Drift", type: "USDC-SOL LP", apy: 12.4, risk: "Medium", liquidity: 82 },
  { protocol: "MarginFi", type: "Lending", apy: 6.8, risk: "Low", liquidity: 97 },
];

const RISK_SCORE = 34;

const riskColor = (r: string) =>
  r === "Low"
    ? "text-neuro-success"
    : r === "Medium"
    ? "text-neuro-warning"
    : "text-neuro-danger";

const trunc = (addr: string | null) =>
  addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "—";

export default function VaultScreen() {
  const {
    connected,
    address,
    vaultAddress,
    solBalance,
    lastTxSignature,
    refreshBalance,
    airdropDevnet,
    signMemoAndDepositVault,
  } = useWalletStore();

  const [busy, setBusy] = useState<null | "airdrop" | "deposit">(null);

  useEffect(() => {
    if (connected) {
      refreshBalance();
    }
  }, [connected, refreshBalance]);

  const onAirdrop = async () => {
    if (!connected) {
      Alert.alert("Wallet not connected", "Connect a wallet first.");
      return;
    }
    setBusy("airdrop");
    try {
      const sig = await airdropDevnet();
      Alert.alert("Airdrop confirmed", `1 SOL devnet received.\n\nSig: ${sig.slice(0, 24)}...`);
    } catch (e) {
      Alert.alert("Airdrop failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onSignAndDeposit = async () => {
    if (!connected) {
      Alert.alert("Wallet not connected", "Connect a wallet first.");
      return;
    }
    setBusy("deposit");
    try {
      const sig = await signMemoAndDepositVault(
        `NEURO Vault Init — risk:${RISK_SCORE} via Solana Mobile`,
        10_000_000
      );
      Alert.alert(
        "Transaction sent",
        `Signature: ${sig.slice(0, 28)}...\n\nTap OK to view on Solana Explorer.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK",
            onPress: () =>
              Linking.openURL(
                `https://explorer.solana.com/tx/${sig}?cluster=devnet`
              ),
          },
        ]
      );
    } catch (e) {
      Alert.alert("Transaction failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-1 bg-neuro-bg">
      <Header title="Vault" showBack />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="bg-neuro-surface border border-neuro-border rounded-xl p-4 mt-4"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-sm font-semibold">PDA Vault</Text>
            <View
              className={`rounded-full px-2 py-0.5 border ${
                connected
                  ? "bg-neuro-success/10 border-neuro-success/20"
                  : "bg-neuro-warning/10 border-neuro-warning/20"
              }`}
            >
              <Text
                className={`text-[10px] font-medium ${
                  connected ? "text-neuro-success" : "text-neuro-warning"
                }`}
              >
                {connected ? "Connected" : "Not connected"}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-y-3">
            {[
              { label: "Owner", value: trunc(address) },
              {
                label: "SOL Balance",
                value:
                  solBalance != null ? `${solBalance.toFixed(4)} SOL` : "—",
              },
              { label: "Vault PDA", value: trunc(vaultAddress) },
              { label: "Cluster", value: "devnet" },
            ].map((item) => (
              <View key={item.label} className="w-1/2">
                <Text className="text-neuro-muted text-[10px] uppercase tracking-wider mb-0.5">
                  {item.label}
                </Text>
                <Text className="text-white text-sm font-medium font-mono">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          className="mt-4 gap-3"
        >
          <Pressable
            onPress={onAirdrop}
            disabled={!connected || busy !== null}
            className={`rounded-xl py-3 items-center border ${
              connected && !busy
                ? "border-neuro-border bg-neuro-surface active:bg-neuro-card"
                : "border-neuro-border bg-neuro-surface opacity-40"
            }`}
          >
            <Text className="text-white text-sm font-semibold">
              {busy === "airdrop" ? "Requesting airdrop..." : "Airdrop 1 SOL (devnet)"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onSignAndDeposit}
            disabled={!connected || busy !== null}
            className={`rounded-xl py-4 items-center ${
              connected && !busy
                ? "bg-neuro-cyan active:opacity-80"
                : "bg-neuro-cyan opacity-40"
            }`}
          >
            <Text className="text-neuro-bg text-base font-semibold">
              {busy === "deposit"
                ? "Signing on device..."
                : "Sign + Deposit 0.01 SOL via MWA"}
            </Text>
          </Pressable>

          {lastTxSignature && (
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://explorer.solana.com/tx/${lastTxSignature}?cluster=devnet`
                )
              }
              className="bg-neuro-card border border-neuro-border rounded-xl p-3"
            >
              <Text className="text-neuro-muted text-[10px] uppercase tracking-wider mb-1">
                Last on-chain signature
              </Text>
              <Text
                className="text-neuro-cyan text-xs font-mono"
                numberOfLines={1}
              >
                {lastTxSignature}
              </Text>
              <Text className="text-neuro-muted text-[10px] mt-1">
                Tap to open Solana Explorer
              </Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="bg-neuro-surface border border-neuro-border rounded-xl p-4 mt-4"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-sm font-semibold">
              Risk Tolerance
            </Text>
            <Pressable>
              <Text className="text-neuro-cyan text-xs">Adjust</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full border-[3px] border-neuro-cyan items-center justify-center">
              <Text className="text-white text-xl font-bold">
                {RISK_SCORE}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-medium mb-1">
                Conservative Profile
              </Text>
              <Text className="text-neuro-muted text-xs leading-5">
                Score {RISK_SCORE}/100 — preference for stable,
                low-volatility strategies.
              </Text>
            </View>
          </View>

          <View className="h-2 bg-neuro-card rounded-full mt-4 overflow-hidden">
            <View
              className="h-full bg-neuro-success rounded-full"
              style={{ width: `${RISK_SCORE}%` }}
            />
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-neuro-success text-[10px] font-mono">
              Conservative
            </Text>
            <Text className="text-neuro-warning text-[10px] font-mono">
              Moderate
            </Text>
            <Text className="text-neuro-danger text-[10px] font-mono">
              Aggressive
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          className="mt-4"
        >
          <Text className="text-white text-sm font-semibold mb-3">
            Yield Opportunities
          </Text>

          {YIELD_OPS.map((op, i) => (
            <Animated.View
              key={op.protocol}
              entering={FadeInDown.delay(350 + i * 80).duration(400)}
            >
              <Pressable className="bg-neuro-surface border border-neuro-border rounded-xl p-4 mb-3 active:bg-neuro-card">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-neuro-cyan/10 items-center justify-center">
                      <Text className="text-neuro-cyan text-sm font-bold">
                        {op.protocol[0]}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white text-sm font-medium">
                        {op.protocol}
                      </Text>
                      <Text className="text-neuro-muted text-[11px]">
                        {op.type}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-neuro-success text-sm font-bold">
                      {op.apy}%
                    </Text>
                    <Text className="text-neuro-muted text-[10px]">APY</Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-4 mt-2 ml-[52px]">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-neuro-muted text-[10px]">Risk:</Text>
                    <Text className={`text-[10px] font-medium ${riskColor(op.risk)}`}>
                      {op.risk}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-neuro-muted text-[10px]">Liquidity:</Text>
                    <Text className="text-white text-[10px] font-medium">
                      {op.liquidity}%
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
