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

type VoiceState =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Hold the mic to talk",
  recording: "Listening — release to send",
  transcribing: "Transcribing speech...",
  thinking: "NEURO is thinking...",
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
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<string>("");
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionRef = useRef<string | undefined>(undefined);
  const cyclePromptIdxRef = useRef(0);

  const setPlaybackMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const setRecordingMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    setPlaybackMode().catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, [setPlaybackMode]);

  const speakResponse = useCallback(
    async (text: string) => {
      const dataUri = await voiceApi.tts(text);

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
    },
    []
  );

  const runPrompt = useCallback(
    async (prompt: string) => {
      setLastPrompt(prompt);
      setState("thinking");
      try {
        const chat = (await agentApi.chat({
          message: prompt,
          wallet_address: address ?? undefined,
          session_id: sessionRef.current,
        })) as { session_id: string; response: string };
        sessionRef.current = chat.session_id;
        setLastResponse(chat.response);
        await speakResponse(chat.response);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Voice error", msg);
        setState("idle");
      }
    },
    [address, speakResponse]
  );

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone needed",
          "Enable microphone access in Android settings to talk to NEURO."
        );
        return;
      }
      await setRecordingMode();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Recording failed", msg);
      setState("idle");
    }
  }, [state, setRecordingMode]);

  const stopAndProcessRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setState("transcribing");
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      await setPlaybackMode();
      if (!uri) throw new Error("No audio captured");

      const stt = await voiceApi.stt(uri);
      const text = stt.text.trim();
      if (!text) throw new Error("Empty transcript");
      await runPrompt(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Voice error", msg);
      setState("idle");
    }
  }, [runPrompt, setPlaybackMode]);

  const handleOrbPress = useCallback(() => {
    if (state === "speaking") {
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setState("idle");
      return;
    }
    if (state !== "idle") return;
    const next = DEMO_PROMPTS[cyclePromptIdxRef.current % DEMO_PROMPTS.length];
    cyclePromptIdxRef.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    runPrompt(next);
  }, [state, runPrompt]);

  const micActive = state === "recording";
  const busy = state !== "idle" && state !== "recording";

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
            isListening={state === "recording"}
            isSpeaking={state === "speaking"}
            isProcessing={state === "transcribing" || state === "thinking"}
            onPress={handleOrbPress}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          {lastPrompt ? (
            <Text className="text-neuro-cyan text-sm text-center mt-10 leading-6 px-4 font-mono">
              "{lastPrompt}"
            </Text>
          ) : (
            <Text className="text-neuro-muted text-xs text-center mt-10 leading-5 px-6 font-mono">
              Hold the mic below to ask anything, or tap the orb to cycle through demo prompts.
            </Text>
          )}
          {lastResponse ? (
            <Text className="text-neuro-muted text-xs text-center mt-4 leading-5 px-4">
              {lastResponse}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      <View className="px-8 pb-10 items-center">
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopAndProcessRecording}
          disabled={busy}
          className={`w-20 h-20 rounded-full items-center justify-center ${
            micActive
              ? "bg-neuro-danger"
              : busy
              ? "bg-neuro-card border border-neuro-border opacity-60"
              : "bg-neuro-cyan"
          }`}
        >
          <Text className="text-2xl">{micActive ? "■" : "🎙"}</Text>
        </Pressable>
        <Text className="text-neuro-muted text-[10px] text-center mt-3">
          {micActive
            ? "Release to send your voice to NEURO"
            : busy
            ? "Working..."
            : "Hold to record · Tap orb for demo prompts"}
        </Text>
        <Text className="text-neuro-muted text-[9px] text-center mt-1">
          STT + TTS powered by ElevenLabs · server-side
        </Text>
      </View>
    </View>
  );
}
