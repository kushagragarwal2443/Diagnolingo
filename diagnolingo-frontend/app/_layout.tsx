import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/src/components/ThemedText";
import { LoadingScreenProvider } from "@/src/components/LoadingScreenContext";
import logger from "@/src/configs/logger";

function useProtectedRoute(user: User | null) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      logger.debug("app/_layout.tsx - useProtectedRoute() - Router replaced to login screen. User: " + user + " , Segments: " + segments);
      router.replace("/(auth)/login");
    }
  }, [user, segments]);
}

// Create a separate error component to use the hook
function ErrorMessage({ error }: { error: string | null }) {
  const insets = useSafeAreaInsets();
  
  return error ? (
    <ThemedText style={[styles.error, { paddingBottom: insets.bottom }]}>
      ERROR: {error}
    </ThemedText>
  ) : null;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setError(null); // Clear error on successful auth state change
      },
      (error) => {
        logger.error("app/_layout.tsx - useEffect() - Auth state change error:", error);
        setError("An error occurred while checking authentication status.");
      }
    );

    // Cleanup the subscription
    return unsubscribe;
  }, []);

  useProtectedRoute(user);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <LoadingScreenProvider>
          <Slot />
          <ErrorMessage error={error} />
        </LoadingScreenProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
});
