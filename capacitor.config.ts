import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aether.audiophile",
  appName: "Aether",
  webDir: "out",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#060709",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#060709",
      style: "DARK", // light icons for dark obsidian background
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#060709",
  },
};

export default config;
