import React from "react";
import { View, Text, Pressable } from "react-native";
import type { ChatAction } from "../store/chatStore";

interface ActionCardProps {
  action: ChatAction;
}

const LABELS: Record<string, string> = {
  bridge: "Bridge Route",
  yield: "Yield Analysis",
  risk: "Risk Assessment",
};

const ICONS: Record<string, string> = {
  bridge: "⟳",
  yield: "↗",
  risk: "◈",
};

export function ActionCard({ action }: ActionCardProps) {
  return (
    <View className="ml-[35px] mb-3 bg-neuro-cyan/5 border border-neuro-cyan/20 rounded-xl p-4">
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-neuro-cyan text-sm">{ICONS[action.type]}</Text>
        <Text className="text-neuro-cyan text-[10px] font-semibold uppercase tracking-wider">
          {LABELS[action.type]}
        </Text>
      </View>

      {/* Data grid */}
      <View className="flex-row flex-wrap gap-y-2">
        {Object.entries(action.data).map(([key, value]) => (
          <View key={key} className="w-1/2">
            <Text className="text-neuro-muted text-[10px] uppercase tracking-wider">
              {key}
            </Text>
            <Text className="text-white text-sm font-medium">{value}</Text>
          </View>
        ))}
      </View>

      {/* Execute button for bridge */}
      {action.type === "bridge" && (
        <Pressable className="bg-neuro-cyan rounded-lg py-2.5 mt-3 items-center active:opacity-80">
          <Text className="text-neuro-bg text-xs font-semibold">
            Execute Transaction →
          </Text>
        </Pressable>
      )}
    </View>
  );
}
