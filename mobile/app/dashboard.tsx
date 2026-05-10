import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PortfolioStats } from "../src/components/PortfolioStats";
import { ActivePositions } from "../src/components/ActivePositions";
import { ChainAllocation } from "../src/components/ChainAllocation";
import { Header } from "../src/components/Header";
import { useWalletStore } from "../src/store/walletStore";

export default function DashboardScreen() {
  const router = useRouter();
  const { connected, refreshBalance } = useWalletStore();

  useEffect(() => {
    if (connected) {
      refreshBalance();
    }
  }, [connected, refreshBalance]);

  return (
    <View className="flex-1 bg-neuro-bg">
      <Header title="Dashboard" showWallet />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <PortfolioStats />
        </Animated.View>

        {/* Quick actions */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="flex-row gap-3 mt-6"
        >
          {[
            { label: "AI Chat", icon: "💬", route: "/chat" as const },
            { label: "Voice", icon: "🎙️", route: "/voice" as const },
            { label: "Vault", icon: "🔒", route: "/vault" as const },
            { label: "History", icon: "📊", route: "/history" as const },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route)}
              className="flex-1 bg-neuro-surface border border-neuro-border rounded-xl py-4 items-center active:bg-neuro-card"
            >
              <Text className="text-lg mb-1">{action.icon}</Text>
              <Text className="text-neuro-muted text-[10px] font-medium">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Active Positions */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <ActivePositions />
        </Animated.View>

        {/* Chain Allocation */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <ChainAllocation />
        </Animated.View>
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav active="home" />
    </View>
  );
}

function BottomNav({ active }: { active: string }) {
  const router = useRouter();
  const items = [
    { key: "home", label: "Home", icon: "⌂", route: "/dashboard" as const },
    { key: "chat", label: "Chat", icon: "◉", route: "/chat" as const },
    { key: "vault", label: "Vault", icon: "◈", route: "/vault" as const },
    { key: "history", label: "History", icon: "◷", route: "/history" as const },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-neuro-surface border-t border-neuro-border flex-row py-2 pb-8 px-4">
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => router.push(item.route)}
          className="flex-1 items-center py-2"
        >
          <Text
            className={`text-lg mb-0.5 ${
              active === item.key ? "opacity-100" : "opacity-40"
            }`}
          >
            {item.icon}
          </Text>
          <Text
            className={`text-[10px] font-medium ${
              active === item.key ? "text-neuro-cyan" : "text-neuro-muted"
            }`}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
