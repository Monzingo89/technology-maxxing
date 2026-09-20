import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.aispace.community",
  appName: "AI Space",
  webDir: "dist",
  server: { androidScheme: "https" },
  ios: { contentInset: "automatic" },
  backgroundColor: "#f6f7f3",
};
export default config;
