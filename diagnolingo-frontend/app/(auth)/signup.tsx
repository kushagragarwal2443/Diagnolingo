import React, { useState } from "react";
import { View, TextInput, Button, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ThemedText } from "@/src/components/ThemedText";
import styles from "@/src/styles/AuthStyles";
import { Ionicons } from "@expo/vector-icons";
import { useLoadingScreen } from "@/src/components/LoadingScreenContext";
import logger from "@/src/configs/logger";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingScreen();

  const handleSignup = async () => {
    logger.debug("app/(auth)/signup.tsx - handleSignup() - Signing up with email/password");
    try {
      setIsLoading(true);
      setError(undefined);
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)/record");
    } catch (err) {
      logger.error("app/(auth)/signup.tsx - handleSignup() - Failed to sign up: ", err);
      setError(
        "Failed to sign up: " +
          (err instanceof Error ? err.message : String(err))
      );
      // In case of error, we don't want to replace the router
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Sign Up</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="gray"
          />
        </TouchableOpacity>
      </View>
      <Button title="Sign Up" onPress={handleSignup} />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <ThemedText
        style={styles.link}
        onPress={() => router.navigate("/(auth)/login")}
      >
        Already have an account? Log in
      </ThemedText>
    </View>
  );
}
