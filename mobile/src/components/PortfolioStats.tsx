import React from "react";
import { View, Text } from "react-native";

const STATS = [
  { label: "Total Value", value: "$12,847", change: "+3.2%", positive: true },
  { label: "Vault Balance", value: "$8,420", change: "+1.8%", positive: true },
  { label: "Avg APY", value: "9.4%", change: "+0.6%", positive: true },
  { label: "Risk Score", value: "34/100", change: "-2", positive: true },
];

export function PortfolioStats() {
  return (
    <View className="flex-row flex-wrap gap-3 mt-4">
      {STATS.map((stat) => (
        <View
          key={stat.label}
          className="bg-neuro-surface border border-neuro-border rounded-xl p-3 flex-1 min-w-[45%]"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-neuro-muted text-[10px]">{stat.label}</Text>
            <Text
              className={`text-[10px] font-mono font-semibold ${
                stat.positive ? "text-neuro-success" : "text-neuro-danger"
              }`}
            >
              {stat.change}
            </Text>
          </View>
          <Text className="text-white text-lg font-bold">{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}
