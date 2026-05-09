import React from "react";
import { View, Text } from "react-native";
import type { Message } from "../store/chatStore";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View
      className={`flex-row mb-3 ${isUser ? "flex-row-reverse" : ""}`}
      style={{ gap: 8 }}
    >
      {/* Avatar */}
      <View
        className={`w-7 h-7 rounded-full items-center justify-center ${
          isUser ? "bg-neuro-card" : "bg-neuro-cyan/20"
        }`}
      >
        <Text
          className={`text-[10px] font-bold ${
            isUser ? "text-neuro-muted" : "text-neuro-cyan"
          }`}
        >
          {isUser ? "U" : "N"}
        </Text>
      </View>

      {/* Bubble */}
      <View
        className={`max-w-[80%] px-4 py-2.5 ${
          isUser
            ? "bg-neuro-cyan/10 border border-neuro-cyan/20 rounded-2xl rounded-tr-sm"
            : "bg-neuro-surface border border-neuro-border rounded-2xl rounded-tl-sm"
        }`}
      >
        <Text className="text-white text-sm leading-6">
          {message.content}
        </Text>
        <Text className="text-neuro-muted text-[10px] font-mono mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}
