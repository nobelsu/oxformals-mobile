import "@/src/setupFonts";
import { ConvexClientProvider } from "@/src/providers/ConvexClientProvider";
import { AuthProvider } from "@/src/components/auth/AuthProvider";
import { PushNotificationProvider } from "@/src/components/push/PushNotificationProvider";
import { DataProvider } from "@/src/components/data/DataProvider";
import { SplashProvider } from "@/src/contexts/SplashContext";
import { ThemeProvider, useOxTheme } from "@/src/contexts/ThemeContext";
import { OxBackButton } from "@/src/components/ui/OxBackButton";
import { OxStackHeaderTitle } from "@/src/components/ui/OxStackHeaderTitle";
import { space } from "@/src/constants/spacing";
import { HandwritingSplash } from "@/src/components/splash/HandwritingSplash";
import { Schoolbell_400Regular } from "@expo-google-fonts/schoolbell";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
        },
        headerBackVisible: false,
        headerBackButtonMenuEnabled: false,
        ...(Platform.OS === "ios"
          ? {
              unstable_headerLeftItems: ({ canGoBack }) =>
                canGoBack
                  ? [
                      {
                        type: "custom" as const,
                        hidesSharedBackground: true,
                        element: <OxBackButton />,
                      },
                    ]
                  : [],
            }
          : {
              headerTitleAlign: "left",
              headerStatusBarHeight: insets.top,
              headerLeft: ({ canGoBack }) =>
                canGoBack ? <OxBackButton /> : undefined,
              headerLeftContainerStyle: {
                paddingLeft: space[2],
                paddingRight: space[2],
              },
              headerTitle: ({ children }) => (
                <OxStackHeaderTitle>{children}</OxStackHeaderTitle>
              ),
            }),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="house-rules" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="listing/[listingId]" />
      <Stack.Screen
        name="history/past-listings"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="history/requests"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="request/[requestId]"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="profile/[userId]"
        options={{ headerShown: true, title: "Profile" }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{ headerShown: true }}
      />
      <Stack.Screen name="chat/new" options={{ headerShown: true }} />
      <Stack.Screen
        name="chat/[conversationId]/index"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="chat/[conversationId]/members"
        options={{ headerShown: true }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ [FONT_DISPLAY]: Schoolbell_400Regular });
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider style={styles.gestureRoot}>
        <View style={styles.gestureRoot}>
          <ConvexClientProvider>
            <AuthProvider>
              <PushNotificationProvider>
                <DataProvider>
                  <SplashProvider splashDone={splashDone}>
                    <ThemeProvider>
                      <BottomSheetModalProvider>
                        <StatusBar style="auto" />
                        <RootStack />
                        {!splashDone && (
                          <HandwritingSplash onDone={onSplashDone} />
                        )}
                      </BottomSheetModalProvider>
                    </ThemeProvider>
                  </SplashProvider>
                </DataProvider>
              </PushNotificationProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
