import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { VoiceOrb } from "../src/components/VoiceOrb";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  processing: "Processing your request...",
  speaking: "NEURO is responding...",
};

const STATE_HINTS: Record<VoiceState, string> = {
  idle: '"Move 300 USDC from Base to Solana"',
  listening: "Speak naturally. I understand DeFi commands.",
  processing: "Analyzing intent and fetching routes...",
  speaking: "Bridge route found via Stargate. Confirm to proceed.",
};

export default function VoiceScreen() {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");

  const handleOrbPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (state === "idle") {
      setState("listening");
      // Simulate voice flow
      setTimeout(() => setState("processing"), 3000);
      setTimeout(() => setState("speaking"), 5000);
      setTimeout(() => setState("idle"), 8000);
    } else if (state === "listening") {
      setState("processing");
      setTimeout(() => setState("speaking"), 2000);
      setTimeout(() => setState("idle"), 5000);
    } else {
      setState("idle");
    }
  };

  return (
    <View className="flex-1 bg-neuro-bg">
      <LinearGradient
        colors={["#080810", "#0a0a1a", "#080810"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Header */}
      <View className="px-4 pt-14 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-neuro-muted text-sm">← Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2 h-2 rounded-full ${
              state === "idle" ? "bg-neuro-muted" : "bg-neuro-success"
            }`}
          />
          <Text className="text-white text-sm font-semibold">Voice Mode</Text>
        </View>
        <Pressable onPress={() => router.push("/chat")}>
          <Text className="text-neuro-cyan text-sm">Text</Text>
        </Pressable>
      </View>

      {/* Center content */}
      <View className="flex-1 items-center justify-center px-8">
        {/* State label */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text className="text-neuro-muted text-xs font-mono uppercase tracking-widest mb-8 text-center">
            {STATE_LABELS[state]}
          </Text>
        </Animated.View>

        {/* Voice Orb */}
        <Animated.View entering={FadeInUp.duration(600)}>
          <VoiceOrb
            size="xl"
            isListening={state === "listening"}
            isSpeaking={state === "speaking"}
            isProcessing={state === "processing"}
            onPress={handleOrbPress}
          />
        </Animated.View>

        {/* Hint text */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text className="text-neuro-muted text-sm text-center mt-10 leading-6 px-4 font-mono">
            {STATE_HINTS[state]}
          </Text>
        </Animated.View>

        {/* Waveform placeholder */}
        {(state === "listening" || state === "speaking") && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-row items-center gap-1 mt-8"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <View
                key={i}
                className="w-1 rounded-full bg-neuro-cyan"
                style={{
                  height:
                    state === "listening"
                      ? Math.random() * 24 + 4
                      : Math.sin(i * 0.5) * 12 + 16,
                  opacity: 0.4 + Math.random() * 0.6,
                }}
              />
            ))}
          </Animated.View>
        )}
      </View>

      {/* Bottom hint */}
      <View className="px-8 pb-12 items-center">
        <Text className="text-neuro-muted text-[10px] text-center">
          Voice powered by ElevenLabs Conversational AI
        </Text>
      </View>
    </View>
  );
}
