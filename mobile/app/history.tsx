import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Header } from "../src/components/Header";

const TRANSACTIONS = [
  { type: "deposit", desc: "Vault Deposit", amount: "+$2,000", sig: "4xKm...bQ9p", time: "2h ago", status: "confirmed" },
  { type: "bridge", desc: "Bridge from Base", amount: "+$300", sig: "8nPr...kL2w", time: "5h ago", status: "confirmed" },
  { type: "risk", desc: "Risk Score Updated", amount: "38 → 34", sig: "2mQx...rT5v", time: "1d ago", status: "confirmed" },
  { type: "deposit", desc: "Vault Deposit", amount: "+$5,120", sig: "9vBc...nH8k", time: "3d ago", status: "confirmed" },
  { type: "bridge", desc: "Bridge from ETH", amount: "+$1,000", sig: "6pLm...nK8w", time: "4d ago", status: "confirmed" },
  { type: "deposit", desc: "Vault Deposit", amount: "+$1,000", sig: "3kWm...hN1p", time: "5d ago", status: "confirmed" },
];

const typeStyle: Record<string, { bg: string; text: string; icon: string }> = {
  deposit: { bg: "bg-neuro-success/10", text: "text-neuro-success", icon: "↓" },
  bridge: { bg: "bg-neuro-cyan/10", text: "text-neuro-cyan", icon: "⟳" },
  risk: { bg: "bg-neuro-warning/10", text: "text-neuro-warning", icon: "◈" },
};

export default function HistoryScreen() {
  return (
    <View className="flex-1 bg-neuro-bg">
      <Header title="Transaction History" showBack />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-neuro-muted text-xs mt-4 mb-3">
          {TRANSACTIONS.length} transactions on Solana Devnet
        </Text>

        {TRANSACTIONS.map((tx, i) => {
          const style = typeStyle[tx.type] || typeStyle.deposit;
          return (
            <Animated.View
              key={tx.sig}
              entering={FadeInDown.delay(i * 60).duration(400)}
            >
              <Pressable
                className="bg-neuro-surface border border-neuro-border rounded-xl p-4 mb-3 active:bg-neuro-card"
                onPress={() =>
                  Linking.openURL(
                    `https://explorer.solana.com/tx/${tx.sig}?cluster=devnet`
                  )
                }
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center ${style.bg}`}
                    >
                      <Text className={`text-base ${style.text}`}>
                        {style.icon}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white text-sm font-medium">
                        {tx.desc}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Text className="text-neuro-muted text-[10px] font-mono">
                          {tx.sig}
                        </Text>
                        <View className="w-1.5 h-1.5 rounded-full bg-neuro-success" />
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className={`text-sm font-medium ${style.text}`}>
                      {tx.amount}
                    </Text>
                    <Text className="text-neuro-muted text-[10px]">
                      {tx.time}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}
