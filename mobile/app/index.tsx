import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { VoiceOrb } from "../src/components/VoiceOrb";
import { useWalletStore } from "../src/store/walletStore";

export default function OnboardingScreen() {
  const router = useRouter();
  const { connected } = useWalletStore();

  return (
    <View className="flex-1 bg-neuro-bg">
      {/* Background gradient */}
      <LinearGradient
        colors={["#080810", "#0a0a18", "#080810"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Grid pattern overlay */}
      <View
        className="absolute inset-0 opacity-10"
        style={{
          borderWidth: 0.5,
          borderColor: "#1e1e3320",
        }}
      />

      <View className="flex-1 items-center justify-center px-6">
        {/* Badge */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <View className="flex-row items-center bg-neuro-surface border border-neuro-border rounded-full px-4 py-2 mb-8">
            <View className="w-2 h-2 rounded-full bg-neuro-success mr-2" />
            <Text className="text-neuro-muted text-xs font-mono uppercase tracking-widest">
              Solana Devnet Live
            </Text>
          </View>
        </Animated.View>

        {/* Heading */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <Text className="text-white text-4xl font-bold text-center mb-2 tracking-tight">
            Your AI{" "}
            <Text className="text-neuro-cyan">Wealth</Text>
          </Text>
          <Text className="text-white text-4xl font-bold text-center mb-4 tracking-tight">
            Operating System
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Text className="text-neuro-muted text-base text-center leading-6 mb-10 px-4">
            Speak naturally. NEURO bridges, deposits, and optimizes your
            cross-chain yield on Solana.
          </Text>
        </Animated.View>

        {/* Voice Orb */}
        <Animated.View entering={FadeInUp.delay(600).duration(800)}>
          <VoiceOrb size="lg" />
          <Text className="text-neuro-muted text-xs text-center mt-4 font-mono px-8">
            "Move 300 USDC from Base to Solana and optimize my yield"
          </Text>
        </Animated.View>

        {/* CTAs */}
        <Animated.View
          entering={FadeInUp.delay(800).duration(600)}
          className="w-full mt-12 gap-3"
        >
          <Pressable
            onPress={() =>
              router.push(connected ? "/dashboard" : "/connect")
            }
            className="bg-neuro-cyan rounded-xl py-4 items-center active:opacity-80"
          >
            <Text className="text-neuro-bg text-base font-semibold">
              {connected ? "Launch Dashboard" : "Get Started"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/chat")}
            className="border border-neuro-border rounded-xl py-4 items-center active:opacity-80"
          >
            <Text className="text-white text-base font-medium">
              Try AI Chat
            </Text>
          </Pressable>
        </Animated.View>

        {/* Features row */}
        <Animated.View
          entering={FadeInUp.delay(1000).duration(600)}
          className="flex-row gap-4 mt-8"
        >
          {["AI-Powered", "Cross-Chain", "Risk-Managed"].map((f) => (
            <View
              key={f}
              className="bg-neuro-surface border border-neuro-border rounded-lg px-3 py-2"
            >
              <Text className="text-neuro-muted text-[10px] font-medium">
                {f}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
