import React from "react";
import { View, Text } from "react-native";

const CHAINS = [
  { chain: "Solana", pct: 85, value: "$10,920" },
  { chain: "Base", pct: 8, value: "$1,028" },
  { chain: "Ethereum", pct: 7, value: "$899" },
];

export function ChainAllocation() {
  return (
    <View className="mt-6 bg-neuro-surface border border-neuro-border rounded-xl p-4">
      <Text className="text-white text-sm font-semibold mb-4">
        Chain Allocation
      </Text>

      {CHAINS.map((chain) => (
        <View key={chain.chain} className="flex-row items-center gap-3 mb-3">
          <Text className="text-white text-xs font-medium w-16">
            {chain.chain}
          </Text>
          <View className="flex-1 h-2 bg-neuro-card rounded-full overflow-hidden">
            <View
              className="h-full bg-neuro-cyan rounded-full"
              style={{
                width: `${chain.pct}%`,
                opacity: 0.3 + (chain.pct / 100) * 0.7,
              }}
            />
          </View>
          <Text className="text-neuro-muted text-xs font-mono w-10 text-right">
            {chain.pct}%
          </Text>
          <Text className="text-white text-xs font-medium w-16 text-right">
            {chain.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
