import Svg, { Circle, Path } from "react-native-svg";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export const palette = {
  canvas: "#F6F3EB",
  paper: "#FFFEFA",
  ink: "#243B35",
  pine: "#244B3F",
  moss: "#5F7365",
  muted: "#6D756E",
  line: "#E5E2D9",
  pale: "#E8EEE7",
  soft: "#F0EDE5",
  coral: "#E58A72",
  yellow: "#E8BD71",
  white: "#FFFFFF",
  success: "#426B54",
};

export function BrandMark({ size = 34, color = palette.pine }: { size?: number; color?: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path d="M8 33c7 0 7-8 15-8s7-13 16-13" fill="none" stroke={color} strokeWidth="3.1" strokeLinecap="round" />
        <Path d="M31 12a8.5 8.5 0 0 1 15 0" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
        <Path d="M31 15h15" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
        <Circle cx="22.8" cy="25" r="2.2" fill={palette.coral} />
      </Svg>
    </View>
  );
}

export function PrimaryButton({ title, onPress, icon, style, accessibilityLabel, disabled }: {
  title: string;
  onPress: () => void;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [uiStyles.primaryButton, style, pressed && uiStyles.pressed, disabled && { opacity: 0.55 }]}
    >
      {icon ? <Text style={uiStyles.primaryIcon} aria-hidden>{icon}</Text> : null}
      <Text style={uiStyles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SoftButton({ title, onPress, style, accessibilityLabel }: {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [uiStyles.softButton, style, pressed && uiStyles.pressed]}
    >
      <Text style={uiStyles.softButtonText}>{title}</Text>
    </Pressable>
  );
}

export function RoundAction({ label, onPress, children, tone = "light", size = 46, style, disabled = false }: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark" | "coral";
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const backgroundColor = tone === "dark" ? palette.pine : tone === "coral" ? palette.coral : palette.pale;
  const color = tone === "light" ? palette.pine : palette.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [uiStyles.roundAction, { width: size, height: size, borderRadius: size / 2, backgroundColor }, pressed && uiStyles.pressed, disabled && { opacity: 0.5 }, style]}
    >
      <Text style={{ color, fontSize: 18, fontWeight: "600" }}>{children}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <View style={uiStyles.sectionHeader}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={uiStyles.sectionTitle}>{title}</Text>
        {detail ? <Text style={uiStyles.sectionDetail}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function ProgressRing({ value, size = 82, stroke = 7, label, centerText, trackColor = palette.line, progressColor = palette.pine, textColor = palette.pine }: { value: number; size?: number; stroke?: number; label?: string; centerText?: string; trackColor?: string; progressColor?: string; textColor?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const displayText = centerText ?? `${clamped}%`;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label ?? `Günlük ilerleme yüzde ${clamped}`} accessibilityValue={{ min: 0, max: 100, now: clamped }} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={progressColor} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - clamped / 100)} fill="none" />
      </Svg>
      <Text style={{ color: textColor, fontSize: size > 72 ? 18 : 14, fontWeight: "700" }}>{displayText}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = palette.pine, height = 8, trackColor = palette.line, label = "İlerleme" }: { value: number; color?: string; height?: number; trackColor?: string; label?: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(value, 100)) }} style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.max(0, Math.min(value, 100))}%`, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Surface({ children, style, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  return <View accessibilityLabel={accessibilityLabel} style={[uiStyles.surface, style]}>{children}</View>;
}

export const uiStyles = StyleSheet.create({
  surface: { backgroundColor: palette.paper, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  sectionTitle: { color: palette.ink, fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.3 },
  sectionDetail: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 17, backgroundColor: palette.pine, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: palette.white, fontSize: 15, fontWeight: "700" },
  primaryIcon: { color: palette.white, fontSize: 19, lineHeight: 22, fontWeight: "500" },
  softButton: { minHeight: 46, borderRadius: 15, backgroundColor: palette.pale, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  softButtonText: { color: palette.pine, fontSize: 14, fontWeight: "600" },
  roundAction: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
