import React from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface VoiceOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  onPress?: () => void;
}

const sizes = {
  sm: { outer: 48, inner: 36, ring: 56 },
  md: { outer: 80, inner: 56, ring: 100 },
  lg: { outer: 120, inner: 80, ring: 150 },
  xl: { outer: 160, inner: 110, ring: 200 },
};

export function VoiceOrb({
  size = "md",
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  onPress,
}: VoiceOrbProps) {
  const s = sizes[size];
  const isActive = isListening || isSpeaking || isProcessing;

  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      ringScale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.3, { duration: 300 });
    }
  }, [isActive, scale, ringScale, opacity]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: s.ring, height: s.ring, alignItems: "center", justifyContent: "center" }}>
      {/* Outer ring */}
      {isActive && (
        <Animated.View
          style={[
            ringStyle,
            {
              position: "absolute",
              width: s.ring,
              height: s.ring,
              borderRadius: s.ring / 2,
              borderWidth: 1,
              borderColor: "#06d6d640",
            },
          ]}
        />
      )}

      {/* Glow */}
      <Animated.View
        style={[
          orbStyle,
          {
            position: "absolute",
            width: s.outer,
            height: s.outer,
            borderRadius: s.outer / 2,
            backgroundColor: isActive ? "#06d6d615" : "#06d6d608",
          },
        ]}
      />

      {/* Main button */}
      <Pressable
        onPress={onPress}
        style={{
          width: s.inner,
          height: s.inner,
          borderRadius: s.inner / 2,
          backgroundColor: isActive ? "#06d6d620" : "#141422",
          borderWidth: 2,
          borderColor: isActive ? "#06d6d660" : "#1e1e33",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: s.inner * 0.3,
            height: s.inner * 0.3,
            borderRadius: s.inner * 0.15,
            backgroundColor: isActive ? "#06d6d6" : "#6b7280",
          }}
        />
      </Pressable>
    </View>
  );
}
