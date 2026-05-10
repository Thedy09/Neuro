import React, { useCallback, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useWalletStore } from "../src/store/walletStore";

const WALLETS = [
  {
    name: "Phantom",
    desc: "Most popular Solana wallet",
    icon: "P",
    color: "#ab9ff2",
  },
  {
    name: "Backpack",
    desc: "xNFT-powered wallet",
    icon: "B",
    color: "#e33d3d",
  },
  {
    name: "Solflare",
    desc: "Native Solana wallet",
    icon: "S",
    color: "#fc8c17",
  },
];

export default function ConnectScreen() {
  const router = useRouter();
  const { connect, connected } = useWalletStore();

  useEffect(() => {
    if (connected) {
      router.replace("/dashboard");
    }
  }, [connected, router]);

  const handleConnect = useCallback(
    async (walletName: string) => {
      try {
        await connect(walletName);
        router.replace("/dashboard");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        Alert.alert(
          "Wallet connection failed",
          `${walletName}: ${message}\n\nMake sure a Solana wallet (Solflare or Phantom) is installed and configured for Devnet.`
        );
      }
    },
    [connect, router]
  );

  return (
    <View className="flex-1 bg-neuro-bg px-6 pt-16">
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <Pressable onPress={() => router.back()} className="mb-8">
          <Text className="text-neuro-muted text-sm">← Back</Text>
        </Pressable>

        <Text className="text-white text-3xl font-bold mb-2">
          Connect Wallet
        </Text>
        <Text className="text-neuro-muted text-base leading-6 mb-8">
          Choose your preferred Solana wallet to get started with NEURO.
        </Text>
      </Animated.View>

      {/* Wallet options */}
      <View className="gap-3">
        {WALLETS.map((wallet, i) => (
          <Animated.View
            key={wallet.name}
            entering={FadeInDown.delay(200 + i * 100).duration(500)}
          >
            <Pressable
              onPress={() => handleConnect(wallet.name)}
              className="flex-row items-center bg-neuro-surface border border-neuro-border rounded-xl p-4 active:bg-neuro-card"
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: wallet.color + "20" }}
              >
                <Text
                  className="text-lg font-bold"
                  style={{ color: wallet.color }}
                >
                  {wallet.icon}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold">
                  {wallet.name}
                </Text>
                <Text className="text-neuro-muted text-xs mt-0.5">
                  {wallet.desc}
                </Text>
              </View>
              <Text className="text-neuro-muted text-lg">→</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* Info */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        className="mt-8 bg-neuro-surface border border-neuro-border rounded-xl p-4"
      >
        <Text className="text-neuro-cyan text-xs font-semibold uppercase tracking-wider mb-2">
          Mobile Wallet Adapter
        </Text>
        <Text className="text-neuro-muted text-xs leading-5">
          NEURO uses Solana Mobile Wallet Adapter for secure on-device
          transaction signing. Your private keys never leave your wallet.
        </Text>
      </Animated.View>
    </View>
  );
}
