import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { activityMetadata, classifyActivity } from "@/lib/planner/activity-category";

export function ActivityGlyph({ title, focused = false, size = 40 }: { title: string; focused?: boolean; size?: number }) {
  const category = classifyActivity(title);
  const metadata = activityMetadata[category];
  const [motion] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    motion.stopAnimation();
    motion.setValue(0);
    if (!focused || reducedMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 430, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 520, useNativeDriver: true }),
      Animated.delay(1500),
    ]));
    animation.start();
    return () => animation.stop();
  }, [focused, motion, reducedMotion]);

  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ["0deg", category === "reading" ? "-7deg" : "6deg"] });
  const scale = motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const transform = category === "movement" ? [{ translateY }, { scale }] : [{ rotate }, { scale }];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${metadata.label} etkinliği`}
      style={[styles.container, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: metadata.background }]}
    >
      <Animated.View style={{ transform }}>
        <Ionicons name={metadata.icon} size={size * 0.52} color={metadata.color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
