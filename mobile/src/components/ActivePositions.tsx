import React from "react";
import { View, Text } from "react-native";

const POSITIONS = [
  { protocol: "Kamino", asset: "USDC", deposited: "$4,200", apy: "8.2%", risk: "Low" },
  { protocol: "Drift", asset: "USDC-SOL", deposited: "$2,800", apy: "12.4%", risk: "Medium" },
  { protocol: "MarginFi", asset: "USDC", deposited: "$1,420", apy: "6.8%", risk: "Low" },
  { protocol: "Jito", asset: "SOL", deposited: "$2,427", apy: "7.1%", risk: "Low" },
];

const riskColor = (r: string) =>
  r === "Low"
    ? "text-neuro-success bg-neuro-success/10 border-neuro-success/20"
    : r === "Medium"
    ? "text-neuro-warning bg-neuro-warning/10 border-neuro-warning/20"
    : "text-neuro-danger bg-neuro-danger/10 border-neuro-danger/20";

export function ActivePositions() {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-sm font-semibold">Active Positions</Text>
        <Text className="text-neuro-muted text-[10px] font-mono">
          {POSITIONS.length} positions
        </Text>
      </View>

      <View className="bg-neuro-surface border border-neuro-border rounded-xl overflow-hidden">
        {POSITIONS.map((pos, i) => (
          <View
            key={pos.protocol}
            className={`flex-row items-center justify-between p-4 ${
              i < POSITIONS.length - 1 ? "border-b border-neuro-border" : ""
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-neuro-cyan/10 items-center justify-center">
                <Text className="text-neuro-cyan text-[10px] font-bold">
                  {pos.protocol[0]}
                </Text>
              </View>
              <View>
                <Text className="text-white text-sm font-medium">{pos.protocol}</Text>
                <Text className="text-neuro-muted text-[11px]">{pos.asset}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="items-end">
                <Text className="text-white text-sm font-medium">{pos.deposited}</Text>
                <Text className="text-neuro-success text-[10px] font-mono">{pos.apy} APY</Text>
              </View>
              <View className={`rounded-full px-2 py-0.5 border ${riskColor(pos.risk)}`}>
                <Text className={`text-[10px] font-medium ${riskColor(pos.risk).split(" ")[0]}`}>
                  {pos.risk}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
