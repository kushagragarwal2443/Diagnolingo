import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HistoryLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          paddingTop: insets.top
        }
      }}
    >
      <Stack.Screen name="transcripts" />
      <Stack.Screen name="ehr" />
    </Stack>
  );
}
