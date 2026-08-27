import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/theme/tokens';
import { useAppFonts } from '@/theme/typography';
import { useAuthDeepLink } from '@/features/auth/useAuthDeepLink';
import { useResumePendingJoin } from '@/features/squad/useResumePendingJoin';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Squads and rosters change slowly — stale data beats a spinner over content
// the user already has (06-offline-sync-and-push.md).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  useAuthDeepLink();
  useResumePendingJoin();

  useEffect(() => {
    // Edge-to-edge is enforced from Android 15 (API 35) and expo-navigation-bar
    // dropped setBackgroundColorAsync accordingly — every screen paints its own
    // colors.bg full-bleed instead, and this just sets icon contrast (04-screens.md).
    if (Platform.OS === 'android') {
      // Despite its void signature, this resolves through a native promise —
      // during a dev-client reload the activity can momentarily be
      // unavailable, which otherwise surfaces as an unhandled rejection.
      try {
        Promise.resolve(NavigationBar.setStyle('light')).catch(() => {});
      } catch {
        // no-op — cosmetic call, safe to skip
      }
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="match/new" options={{ presentation: 'modal' }} />
          {/*
            No gestureEnabled override here. That prop controls react-navigation's
            own iOS-style edge-swipe gesture — on Android it also intercepts the
            system back dispatch, which stops BackHandler's hardwareBackPress
            listener in match/live.tsx from ever firing, defeating the confirm
            sheet entirely (verified on-device: back press became a total no-op).
            iOS is out of scope anyway; Android back is handled in JS instead.
          */}
          <Stack.Screen name="match/live" />
          <Stack.Screen name="match/[id]" />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="squad/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="squad/join/[code]" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
