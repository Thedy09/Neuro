import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Header } from "../src/components/Header";

const VAULT = {
  owner: "7xKX...m9Qp",
  riskScore: 34,
  totalDeposited: "$8,420.00",
  createdAt: "2025-12-15",
  bump: 254,
  status: "Active",
};

const YIELD_OPS = [
  { protocol: "Jito", type: "Liquid Staking", apy: 7.1, risk: "Low", liquidity: 98 },
  { protocol: "Kamino", type: "USDC Vault", apy: 8.2, risk: "Low", liquidity: 95 },
  { protocol: "Drift", type: "USDC-SOL LP", apy: 12.4, risk: "Medium", liquidity: 82 },
  { protocol: "MarginFi", type: "Lending", apy: 6.8, risk: "Low", liquidity: 97 },
];

const riskColor = (r: string) =>
  r === "Low" ? "text-neuro-success" : r === "Medium" ? "text-neuro-warning" : "text-neuro-danger";

export default function VaultScreen() {
  return (
    <View className="flex-1 bg-neuro-bg">
      <Header title="Vault" showBack />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Vault overview */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="bg-neuro-surface border border-neuro-border rounded-xl p-4 mt-4"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-sm font-semibold">PDA Vault</Text>
            <View className="bg-neuro-success/10 border border-neuro-success/20 rounded-full px-2 py-0.5">
              <Text className="text-neuro-success text-[10px] font-medium">
                {VAULT.status}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-y-3">
            {[
              { label: "Owner", value: VAULT.owner },
              { label: "Total Deposited", value: VAULT.totalDeposited },
              { label: "Created", value: VAULT.createdAt },
              { label: "PDA Bump", value: String(VAULT.bump) },
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

        {/* Risk score */}
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
                {VAULT.riskScore}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-medium mb-1">
                Conservative Profile
              </Text>
              <Text className="text-neuro-muted text-xs leading-5">
                Score {VAULT.riskScore}/100 — preference for stable,
                low-volatility strategies.
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View className="h-2 bg-neuro-card rounded-full mt-4 overflow-hidden">
            <View
              className="h-full bg-neuro-success rounded-full"
              style={{ width: `${VAULT.riskScore}%` }}
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

        {/* Yield opportunities */}
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
