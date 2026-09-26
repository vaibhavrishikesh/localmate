import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.localmate.rishikesh",
  appName: "LocalMate",
  webDir: "android-www",
  server: {
    // Live Next.js app on Vercel — Android shell loads this URL
    url: "https://localmate-omega.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#1a2624",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a2624",
    },
  },
};

export default config;
