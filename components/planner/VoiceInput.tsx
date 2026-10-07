import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { transcribeRecording } from "@/lib/planner/voice";
import { palette } from "./PlannerUI";

type Props = { onTranscript: (text: string) => void; onMessage: (message: string) => void };

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VoiceInput({ onTranscript, onMessage }: Props) {
  const recordedUri = useRef<string | null>(null);
  const startedAt = useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.isFinished && status.url) recordedUri.current = status.url;
  });
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    if (recorder.isRecording) {
      void recorder.stop().then(() => {
        if (recorder.uri?.startsWith("blob:") && typeof URL !== "undefined") URL.revokeObjectURL(recorder.uri);
      }).catch(() => undefined);
    }
  }, [recorder]);

  const start = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onMessage("Mikrofon izni verilmedi. İzinleri açabilir veya görevlerini yazarak ekleyebilirsin.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      recordedUri.current = null;
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsedSeconds(0);
      setRecording(true);
      onMessage("Dinliyorum… Bitirdiğinde kaydı durdur; metni kontrol edip düzeltebilirsin.");
    } catch {
      setRecording(false);
      onMessage("Kayıt başlatılamadı. Tarayıcı/cihaz mikrofon iznini ve internet bağlantını kontrol et; istersen yazarak devam et.");
    }
  };

  const stop = async () => {
    if (!recording || working) return;
    setRecording(false);
    setWorking(true);
    try {
      await recorder.stop();
      const uri = recorder.uri ?? recorder.getStatus().url ?? recordedUri.current;
      if (!uri) throw new Error("Ses kaydı bulunamadı. Kısa bir kayıt daha deneyebilirsin.");
      const text = await transcribeRecording(uri);
      if (!text.trim()) throw new Error("Konuşma anlaşılamadı. Daha yakından ve kısa konuşabilir veya yazarak devam edebilirsin.");
      onTranscript(text.trim());
      onMessage("Metni gözden geçir; planına eklemeden önce saatleri ve görevleri düzeltebilirsin.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Ses metne dönüştürülemedi. Yazarak devam edebilirsin.");
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setWorking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={recording ? stop : start}
        disabled={working}
        accessibilityRole="button"
        accessibilityState={{ disabled: working, busy: working }}
        accessibilityLabel={working ? "Ses Türkçe metne dönüştürülüyor" : recording ? `Kaydı bitir, geçen süre ${clock(elapsedSeconds)}` : "Görevleri sesle söyle"}
        accessibilityHint="Türkçe konuşmanı güvenli şekilde metne çevirir. Metin plana eklenmeden önce düzenlenebilir."
        style={({ pressed }) => [styles.button, recording && styles.recording, pressed && { opacity: 0.82 }, working && { opacity: 0.6 }]}
      >
        {working ? <ActivityIndicator color={palette.pine} size="small" /> : <Text style={styles.icon}>{recording ? "■" : "◖"}</Text>}
        <Text style={styles.label}>{working ? "Metne dönüşüyor…" : recording ? `Bitir · ${clock(elapsedSeconds)}` : "Sesle ekle"}</Text>
      </Pressable>
      {recording ? <View style={styles.recordingHint}><View style={styles.pulse} /><Text style={styles.hintText}>Türkçe dinliyorum</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  button: { minHeight: 50, borderRadius: 16, backgroundColor: palette.pale, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 11 },
  recording: { backgroundColor: "#F8E8E1", borderWidth: 1, borderColor: "#E8B9A9" },
  icon: { fontSize: 17, color: palette.pine, fontWeight: "700" },
  label: { fontSize: 12, color: palette.pine, fontWeight: "700" },
  recordingHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, paddingHorizontal: 3 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.coral },
  hintText: { color: palette.muted, fontSize: 10 },
});
