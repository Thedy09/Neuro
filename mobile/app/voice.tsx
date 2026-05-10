import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { VoiceOrb } from "../src/components/VoiceOrb";
import { agentApi, voiceApi } from "../src/services/api";
import { useWalletStore } from "../src/store/walletStore";

type VoiceState = "idle" | "processing" | "speaking";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Tap to ask NEURO",
  processing: "Thinking + generating voice...",
  speaking: "NEURO is speaking",
};

const DEMO_PROMPTS = [
  "Move 300 USDC from Base to Solana and pick the best yield",
  "What is my current portfolio risk score?",
  "Recommend a conservative yield strategy on Solana devnet",
  "Bridge 0.05 ETH from Arbitrum to Solana",
];

export default function VoiceScreen() {
  const router = useRouter();
  const { address } = useWalletStore();
  const [state, setState] = useState<VoiceState>("idle");
  const [lastPrompt, setLastPrompt] = useState<string>(DEMO_PROMPTS[0]);
  const [lastResponse, setLastResponse] = useState<string>("");
  const soundRef = useRef<Audio.Sound | null>(null);
  const sessionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const runVoice = useCallback(async (prompt: string) => {
    setLastPrompt(prompt);
    setState("processing");

    try {
      const chat = (await agentApi.chat({
        message: prompt,
        wallet_address: address ?? undefined,
        session_id: sessionRef.current,
      })) as { session_id: string; response: string };
      sessionRef.current = chat.session_id;
      setLastResponse(chat.response);

      const dataUri = await voiceApi.tts(chat.response);

      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {
          /* ignore */
        }
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      setState("speaking");

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState("idle");
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Voice error", msg);
      setState("idle");
    }
  }, [address]);

  const handleOrbPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (state === "speaking") {
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setState("idle");
      return;
    }
    if (state === "processing") return;

    const next =
      DEMO_PROMPTS[(DEMO_PROMPTS.indexOf(lastPrompt) + 1) % DEMO_PROMPTS.length];
    runVoice(next);
  }, [state, lastPrompt, runVoice]);

  return (
    <View className="flex-1 bg-neuro-bg">
      <LinearGradient
        colors={["#080810", "#0a0a1a", "#080810"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

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

      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(400)}>
          <Text className="text-neuro-muted text-xs font-mono uppercase tracking-widest mb-8 text-center">
            {STATE_LABELS[state]}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600)}>
          <VoiceOrb
            size="xl"
            isListening={false}
            isSpeaking={state === "speaking"}
            isProcessing={state === "processing"}
            onPress={handleOrbPress}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text className="text-neuro-cyan text-sm text-center mt-10 leading-6 px-4 font-mono">
            "{lastPrompt}"
          </Text>
          {lastResponse && (
            <Text className="text-neuro-muted text-xs text-center mt-4 leading-5 px-4">
              {lastResponse}
            </Text>
          )}
        </Animated.View>

        {state === "speaking" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-row items-center gap-1 mt-8"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <View
                key={i}
                className="w-1 rounded-full bg-neuro-cyan"
                style={{
                  height: Math.sin(i * 0.5 + Date.now() / 200) * 12 + 16,
                  opacity: 0.4 + Math.random() * 0.6,
                }}
              />
            ))}
          </Animated.View>
        )}
      </View>

      <View className="px-8 pb-12 items-center">
        <Text className="text-neuro-muted text-[10px] text-center">
          Voice powered by ElevenLabs · Tap orb to cycle through demo prompts
        </Text>
      </View>
    </View>
  );
}
