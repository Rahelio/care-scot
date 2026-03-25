import Constants from "expo-constants";

function getApiUrl(): string {
  if (!__DEV__) {
    // Replace with your production URL when deploying
    return "https://your-production-url.com";
  }

  // Expo exposes the Metro bundler host via debuggerHost.
  // Since Next.js runs on the same machine, we just swap the port to 3000.
  // Works for: iOS/Android on LAN, simulators, and Expo tunnel.
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0]; // strip the Metro port
    return `http://${host}:3000`;
  }

  // Fallback for web or when host can't be determined
  return "http://192.168.10.125:3000";
}

export const API_BASE_URL = getApiUrl();