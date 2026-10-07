import { File } from "expo-file-system";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { recordingContentType } from "./audio-utils";
export { parsePlannerInput, splitVoiceTasks } from "./voice-tasks";

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export async function transcribeRecording(uri: string): Promise<string> {
  let file: InstanceType<typeof File> | null = null;
  let body: ArrayBuffer;
  let contentType = recordingContentType(Platform.OS);
  try {
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      if (!response.ok) throw new Error("Ses kaydı okunamadı. Yeniden kaydedip dene.");
      const blob = await response.blob();
      if (blob.size > MAX_AUDIO_BYTES) throw new Error("Kayıt 16 MB sınırını aşıyor. Daha kısa konuşmayı dene.");
      if (blob.size === 0) throw new Error("Ses kaydı boş görünüyor. Mikrofon iznini kontrol et.");
      contentType = (blob.type.split(";")[0] || contentType).toLowerCase();
      body = await blob.arrayBuffer();
    } else {
      file = new File(uri);
      body = await file.arrayBuffer();
      if (body.byteLength > MAX_AUDIO_BYTES) throw new Error("Kayıt 16 MB sınırını aşıyor. Daha kısa konuşmayı dene.");
      if (body.byteLength === 0) throw new Error("Ses kaydı boş görünüyor. Yeniden kaydedip dene.");
    }

    const endpoint = `${getApiBaseUrl()}/api/voice/transcribe?language=tr`;
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (Platform.OS !== "web") {
      const token = await Auth.getSessionToken();
      if (!token) throw new Error("Sesli görev eklemek için oturum açman gerekiyor.");
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, { method: "POST", headers, body, credentials: "include" });
    let result: { text?: string; error?: string } = {};
    try { result = (await response.json()) as { text?: string; error?: string }; }
    catch { /* Surface a stable message if an intermediary returns non-JSON. */ }
    if (!response.ok || !result.text) {
      throw new Error(result.error || "Ses metne dönüştürülemedi. İstersen yazarak ekleyebilirsin.");
    }
    return result.text;
  } catch (error) {
    if (error instanceof Error && /Network request failed|Failed to fetch/i.test(error.message)) {
      throw new Error("Ses servisine bağlanılamadı. İnternetini kontrol edip yeniden dene.");
    }
    throw error;
  } finally {
    if (Platform.OS === "web") {
      if (uri.startsWith("blob:") && typeof URL !== "undefined") URL.revokeObjectURL(uri);
    } else if (file) {
      try { file.delete(); } catch { /* Ignore an already-cleaned recording. */ }
    }
  }
}
