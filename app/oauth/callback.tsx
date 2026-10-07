import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { palette } from "@/components/planner/PlannerUI";
import * as Api from "@/lib/_core/api";
import * as AuthStorage from "@/lib/_core/auth";
import { emitAuthChanged } from "@/lib/_core/auth-events";
import { useAuth } from "@/lib/_core/AuthProvider";
import * as Linking from "expo-linking";

type Status = "processing" | "error";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const handleCallback = async () => {
      try {
        let code = typeof params.code === "string" ? params.code : "";
        let state = typeof params.state === "string" ? params.state : "";
        const providerError = typeof params.error === "string" ? params.error : "";
        if (providerError) throw new Error("Hesap bağlantısı iptal edildi veya tamamlanamadı.");

        if (!code || !state) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            const parsed = new URL(initialUrl);
            code ||= parsed.searchParams.get("code") ?? "";
            state ||= parsed.searchParams.get("state") ?? "";
            if (parsed.searchParams.has("error")) throw new Error("Hesap bağlantısı tamamlanamadı.");
          }
        }
        if (!code || !state) throw new Error("Giriş isteği eksik. Lütfen yeniden başlatın.");

        const result = await Api.exchangeOAuthCode(code, state);
        if (!result.sessionToken || !result.user?.openId) throw new Error("Hesap bilgisi doğrulanamadı.");
        await AuthStorage.setSessionToken(result.sessionToken);
        await AuthStorage.setUserInfo({
          id: result.user.id ?? 0,
          openId: result.user.openId,
          name: result.user.name ?? null,
          email: result.user.email ?? null,
          loginMethod: result.user.loginMethod ?? null,
          lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
        });
        emitAuthChanged();
        const user = await refresh();
        if (!user) throw new Error("Oturum doğrulanamadı. Yeniden deneyin.");
        if (active) router.replace("/(tabs)");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        const message = error instanceof Error ? error.message : "Giriş tamamlanamadı.";
        setErrorMessage(message.includes("Failed to fetch") ? "Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene." : message);
      }
    };
    void handleCallback();
    return () => { active = false; };
  }, [params.code, params.state, params.error, refresh, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {status === "processing" ? (
          <>
            <View style={styles.mark}><BrandLogo size={36} /></View>
            <ActivityIndicator size="small" color={palette.pine} />
            <Text style={styles.title}>Hesabın güvenle bağlanıyor</Text>
            <Text style={styles.body}>Birazdan Ritminde’ye döneceksin.</Text>
          </>
        ) : (
          <>
            <View style={[styles.mark, styles.errorMark]}><Text style={styles.errorGlyph}>!</Text></View>
            <Text style={styles.title}>Giriş tamamlanamadı</Text>
            <Text accessibilityRole="alert" style={styles.body}>{errorMessage}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/auth")} style={styles.button}>
              <Text style={styles.buttonText}>Yeniden dene</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  mark: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: palette.pale },
  errorMark: { backgroundColor: "#F8E8E1" },
  errorGlyph: { color: palette.coral, fontSize: 28, fontWeight: "800" },
  title: { color: palette.ink, fontSize: 21, fontWeight: "700", textAlign: "center", marginTop: 8 },
  body: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 320 },
  button: { minHeight: 50, justifyContent: "center", paddingHorizontal: 24, borderRadius: 16, backgroundColor: palette.pine, marginTop: 10 },
  buttonText: { color: "#FFFDF7", fontSize: 14, fontWeight: "700" },
});
