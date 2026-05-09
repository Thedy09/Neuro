import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChatBubble } from "../src/components/ChatBubble";
import { ActionCard } from "../src/components/ActionCard";
import { VoiceOrb } from "../src/components/VoiceOrb";
import { useChatStore } from "../src/store/chatStore";

const QUICK_PROMPTS = [
  "Bridge USDC from Base",
  "Analyze my yield",
  "Portfolio risk score",
];

export default function ChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const { messages, isTyping, sendMessage } = useChatStore();

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    await sendMessage(trimmed);
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [input, isTyping, sendMessage]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neuro-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-neuro-surface border-b border-neuro-border px-4 pt-14 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-neuro-muted text-sm">← Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-neuro-success" />
          <Text className="text-white text-sm font-semibold">NEURO AI</Text>
        </View>
        <Pressable onPress={() => router.push("/voice")}>
          <Text className="text-neuro-cyan text-sm">Voice</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((msg, i) => (
          <Animated.View
            key={msg.id}
            entering={FadeInDown.delay(i * 50).duration(300)}
          >
            <ChatBubble message={msg} />
            {msg.action && <ActionCard action={msg.action} />}
          </Animated.View>
        ))}

        {isTyping && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <View className="flex-row items-center gap-2 mt-2 mb-2">
              <View className="w-7 h-7 rounded-full bg-neuro-cyan/20 items-center justify-center">
                <Text className="text-neuro-cyan text-[10px] font-bold">
                  N
                </Text>
              </View>
              <View className="bg-neuro-surface border border-neuro-border rounded-2xl rounded-tl-sm px-4 py-3">
                <Text className="text-neuro-muted text-xs">
                  NEURO is thinking...
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Quick prompts */}
      <View className="px-4 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => setInput(prompt)}
              className="border border-neuro-border rounded-full px-3 py-1.5 active:border-neuro-cyan"
            >
              <Text className="text-neuro-muted text-[10px] font-medium">
                {prompt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input bar */}
      <View className="bg-neuro-surface border-t border-neuro-border px-4 py-3 pb-8 flex-row items-center gap-3">
        <VoiceOrb size="sm" />
        <View className="flex-1 flex-row items-center bg-neuro-card border border-neuro-border rounded-xl px-4 py-2.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask NEURO anything..."
            placeholderTextColor="#6b7280"
            className="flex-1 text-white text-sm"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isTyping}
            className={`w-8 h-8 rounded-lg items-center justify-center ${
              input.trim() && !isTyping ? "bg-neuro-cyan" : "bg-neuro-border"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                input.trim() && !isTyping
                  ? "text-neuro-bg"
                  : "text-neuro-muted"
              }`}
            >
              ↑
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
