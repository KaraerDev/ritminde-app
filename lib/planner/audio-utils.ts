export function recordingContentType(platform: "web" | "ios" | "android" | string): string {
  return platform === "web" ? "audio/webm" : "audio/m4a";
}
