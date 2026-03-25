import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useRouter, useSegments, Slot } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Providers } from "@/components/providers";
import { useAuth } from "@/context/auth";

function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inApp = segments[0] === "(app)";

    if (!user && inApp) {
      router.replace("/login");
    } else if (user && !inApp && segments[0] !== undefined) {
      router.replace("/");
    } else if (user && !segments.length) {
      router.replace("/");
    }
  }, [user, isLoading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Providers>
        <AnimatedSplashOverlay />
        <AuthGuard />
      </Providers>
    </ThemeProvider>
  );
}
