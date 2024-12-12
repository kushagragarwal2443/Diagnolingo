import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from "@/src/components/ThemedText";
import { getEHR } from "@/src/service/api";
import { getAuth } from "firebase/auth";
import { useLoadingScreen } from "@/src/components/LoadingScreenContext";
import logger from "@/src/configs/logger";
import Collapsible from 'react-native-collapsible';

interface EHRData {
  conversation_title: string;
  audio_url: string;
  transcript_text: string;
  extra_note: string;
  timestamp: string;
  ehr_details: string;
}

const EHRScreen = () => {
  const params = useLocalSearchParams();
  const [ehrData, setEHRData] = useState<EHRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isLoading, setIsLoading } = useLoadingScreen();
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(true);
  const [isExtraNoteCollapsed, setIsExtraNoteCollapsed] = useState(true);

  useEffect(() => {
    if (error) {
      logger.error("app/(tabs)/history/ehr.tsx - useEffect() - Displaying Error: ", error);
    }
  }, [error]);

  const fetchEHR = async () => {
    logger.debug("app/(tabs)/history/ehr.tsx - fetchEHR() - Fetching EHR data");
    setIsLoading(true);
    setError(null);
    try {
      const patientUuid = getAuth().currentUser?.uid;
      if (!patientUuid) {
        logger.error("app/(tabs)/history/ehr.tsx - fetchEHR() - User not authenticated");
        setError("User not authenticated");
        return;
      }

      const data = await getEHR(
        patientUuid,
        String(params.conversationUuid)
      );
      setEHRData(data);
    } catch (error) {
      logger.error("app/(tabs)/history/ehr.tsx - fetchEHR() - Failed to fetch EHR: ", error);
      setError("Failed to fetch EHR: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEHR();
  }, [params.conversationUuid]);

  return (
    <View style={styles.container}>
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <ThemedText style={styles.title}>{String(params.conversationTitle).trim()}</ThemedText>
      {ehrData && (
        <ScrollView style={styles.scrollContainer}>
          <ThemedText style={styles.noteText}>Created On: {new Date(ehrData?.timestamp).toLocaleString()}</ThemedText>
          <>
            <TouchableOpacity 
              style={styles.dropdownHeader}
              onPress={() => setIsTranscriptCollapsed(!isTranscriptCollapsed)}
            >
              <View style={styles.dropdownTitleContainer}>
                <ThemedText style={styles.dropdownTitle}>Transcript</ThemedText>
                <ThemedText style={styles.dropdownArrow}>
                  {isTranscriptCollapsed ? '▼' : '▲'}
                </ThemedText>
              </View>
            </TouchableOpacity>
            <Collapsible collapsed={isTranscriptCollapsed}>
              <View style={styles.dropdownContent}>
                <ThemedText style={styles.ehrText}>{ehrData?.transcript_text.trim()}</ThemedText>
              </View>
            </Collapsible>
          </>
          {false && ehrData?.audio_url && (
            <ThemedText style={styles.noteText}>Audio URL: {ehrData?.audio_url}</ThemedText>
          )}
          {ehrData?.ehr_details && (
            <>
              <ThemedText style={styles.nonDropdownTitle}>EHR Details</ThemedText>
              <ThemedText style={styles.detailsText}>{JSON.stringify(ehrData.ehr_details, null, 4)}</ThemedText>
            </>
          )}
          <>
            <TouchableOpacity 
              style={styles.dropdownHeader}
              onPress={() => setIsExtraNoteCollapsed(!isExtraNoteCollapsed)}
            >
              <View style={styles.dropdownTitleContainer}>
                <ThemedText style={styles.dropdownTitle}>Extra Note</ThemedText>
                <ThemedText style={styles.dropdownArrow}>
                  {isExtraNoteCollapsed ? '▼' : '▲'}
                </ThemedText>
              </View>
            </TouchableOpacity>
            <Collapsible collapsed={isExtraNoteCollapsed}>
              <View style={styles.dropdownContent}>
                <ThemedText style={styles.ehrText}>{ehrData?.extra_note.trim()}</ThemedText>
              </View>
            </Collapsible>
          </>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  ehrText: {
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: "red",
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  noteText: {
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  detailsText: {
    fontSize: 14,
    marginTop: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  dropdownHeader: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
  },
  dropdownContent: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
  },
  dropdownTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nonDropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
});

export default EHRScreen;
