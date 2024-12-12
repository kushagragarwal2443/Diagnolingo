import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Text, RefreshControl, TouchableOpacity } from "react-native";
import { ThemedText } from "@/src/components/ThemedText";
import { getTranscripts } from "@/src/service/api";
import { useLoadingScreen } from "@/src/components/LoadingScreenContext";
import { getAuth } from "firebase/auth";
import logger from "@/src/configs/logger";
import { useRouter } from 'expo-router';

export default function SamplesScreen() {
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState([]);
  const { isLoading, setIsLoading } = useLoadingScreen();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Log the error to the console whenever the error state changes.
  useEffect(() => {
    if (error) {
      logger.error("app/(tabs)/history/transcripts.tsx - useEffect() - Displaying Error: ", error);
    }
  }, [error]);

  const fetchTranscripts = async () => {
    logger.debug("app/(tabs)/history/transcripts.tsx - fetchTranscripts() - Fetching transcripts");
    setIsLoading(true);
    try {
      const patientUuid = getAuth().currentUser?.uid;
      if (!patientUuid) {
        logger.error("app/(tabs)/history/transcripts.tsx - fetchTranscripts() - User not authenticated");
        setError("User not authenticated");
        return;
      }
      const data = await getTranscripts(patientUuid);
      setTranscripts(data);
    } catch (error) {
      logger.error("app/(tabs)/history/transcripts.tsx - fetchTranscripts() - Failed to fetch transcripts: ", error);
      setError("Failed to fetch transcripts: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    logger.debug("app/(tabs)/history/transcripts.tsx - useEffect() - Initial fetch of transcripts");
    fetchTranscripts();
  }, []);

  const onRefresh = async () => {
    logger.debug("app/(tabs)/history/transcripts.tsx - onRefresh() - Refreshing transcripts");
    setRefreshing(true);
    setError(null);
    try {
      await fetchTranscripts();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const handlePress = () => {
      logger.debug("app/(tabs)/history/transcripts.tsx - renderItem() - Navigating to EHR screen for conversation: ", item.conversation_uuid);
      router.push({
        pathname: '/(tabs)/history/ehr',
        params: {
          conversationUuid: item.conversation_uuid,
          conversationTitle: item.conversation_title,
        }
      });
    };

    return (
      <TouchableOpacity onPress={handlePress} style={styles.itemContainer}>
        <ThemedText style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.conversation_title}
        </ThemedText>
        <ThemedText style={styles.transcript} numberOfLines={3} ellipsizeMode="tail">
          {item.transcript_text.trim()}
        </ThemedText>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <ThemedText style={styles.header}>
        Conversation History
      </ThemedText>
      <FlatList
        data={transcripts}
        renderItem={renderItem}
        keyExtractor={(item) => item.conversation_uuid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <ThemedText style={styles.emptyMessage}>
            No conversations found. Your past conversations will appear here.
          </ThemedText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  itemContainer: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  transcript: {
    marginTop: 5,
  },
  timestamp: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "right",
  },
  error: {
    color: "red",
    marginTop: 20,
    textAlign: "center",
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});
