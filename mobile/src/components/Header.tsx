import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useWalletStore } from "../store/walletStore";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showWallet?: boolean;
}

export function Header({ title, showBack, showWallet }: HeaderProps) {
  const router = useRouter();
  const { connected, address, solBalance } = useWalletStore();

  const truncated = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "";
  const balanceLabel =
    solBalance != null ? `${solBalance.toFixed(2)} SOL` : null;

  return (
    <View className="bg-neuro-surface border-b border-neuro-border px-4 pt-14 pb-3 flex-row items-center justify-between">
      {showBack ? (
        <Pressable onPress={() => router.back()} className="w-16">
          <Text className="text-neuro-muted text-sm">← Back</Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-neuro-cyan/20 items-center justify-center">
            <Text className="text-neuro-cyan text-[10px] font-bold">N</Text>
          </View>
          <Text className="text-white text-sm font-bold tracking-tight">
            NEURO
          </Text>
        </View>
      )}

      <Text className="text-white text-base font-semibold">{title}</Text>

      {showWallet && connected ? (
        <View className="bg-neuro-card border border-neuro-border rounded-lg px-2.5 py-1.5 items-end">
          <Text className="text-neuro-cyan text-[10px] font-mono">
            {truncated}
          </Text>
          {balanceLabel && (
            <Text className="text-neuro-muted text-[9px] font-mono mt-0.5">
              {balanceLabel}
            </Text>
          )}
        </View>
      ) : (
        <View className="w-16" />
      )}
    </View>
  );
}
