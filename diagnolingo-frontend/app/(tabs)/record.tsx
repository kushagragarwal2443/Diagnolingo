import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Button, Alert } from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system";
import { ThemedText } from "@/src/components/ThemedText";
import { processAudio } from "@/src/service/api";
import { createNewSession, getNextChunkId, SessionInfo } from "@/src/service/audioProcessing/sessionManager";
import { getAuth } from "firebase/auth";
import logger from "@/src/configs/logger";
import { AppConfigs } from "@/src/configs/appConfigs";
import { useLoadingScreen } from "@/src/components/LoadingScreenContext";

export default function RecordScreen() {
  
  // States //
  // When error state changes, we display the error on the screen
  const [error, setError] = useState<string | null>(null);
  // When recording state changes, we display the start/stop recording button
  const [isRecording, setIsRecording] = useState(false);
  // When duration state changes (every second), we update the duration timer on the screen
  const [duration, setDuration] = useState(0);
  
  // Refs //
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionInfoRef = useRef<SessionInfo | null>(null);
  const intervalRefTotalAudioDuration = useRef<NodeJS.Timeout | null>(null);
  const timeoutRefProcessChunk = useRef<NodeJS.Timeout | null>(null);

  // Hooks //
  const { isLoading, setIsLoading } = useLoadingScreen();

  // Clean up the intervals when the component unmounts
  useEffect(() => {
    return () => {
      logger.debug("app/(tabs)/record.tsx - useEffect() - Cleaning up intervals");
      clearIntervals();
    };
  }, []);

  // Log the error to the console whenever the error state changes.
  useEffect(() => {
    if (error) {
      logger.error("app/(tabs)/record.tsx - useEffect() - Displaying Error: ", error);
    }
  }, [error]);

  async function startRecording() {
    logger.debug("app/(tabs)/record.tsx - startRecording() - Starting recording");
    // Reset the error state
    setError(null);
    
    try {
      // 1. Pre-requisites for recording //

      const permissionGranted = await requestPermissions();
      if (!permissionGranted) return;

      await configureAudio();

      // 2. Start a new recording //

      const newRecording = await createNewRecording();

      // 3. Set the required states & Total Duration Timer //

      recordingRef.current = newRecording;
      logger.debug("app/(tabs)/record.tsx - startRecording() - recording: ", recordingRef.current);
      setIsRecording(true);

      sessionInfoRef.current = createNewSession();
      setDuration(0);
      startDurationTimer();

      // 4. Start a Schedule to process chunks every 30 seconds //

      scheduleChunkProcessing();
    } catch (err) {
      logger.error("app/(tabs)/record.tsx - startRecording() - Failed to start recording: ", err);
      setError("Failed to start recording: " +
        (err instanceof Error ? err.message : String(err))
      );
    }
  }

  async function stopRecording() {
    logger.debug("app/(tabs)/record.tsx - stopRecording() - Stopping recording");
    setIsLoading(true);

    if (!recordingRef.current || !sessionInfoRef.current) {
      logger.error("app/(tabs)/record.tsx - stopRecording() - No audio recording in progress - recordingRef.current: ", recordingRef.current, " sessionInfoRef.current: ", sessionInfoRef.current);
      setError("No audio recording in progress!");
      setIsLoading(false);
      return;
    }

    try {
      // 1. The very first thing is to clearIntervals because we want to stop DurationCounter and also, 
      //    we dont want to trigger the automatic 30 second chunk processing (imagine if StopRecording 
      //    was almost coinciding with 30 second from previous chunk) /
      
      clearIntervals();

      // 2. Process the final chunk //
      
      await processIntermediateChunk(true);

      // 3. Clean up and reset states //
      
      await resetAudioMode();
      
      setIsRecording(false);
      recordingRef.current = null;
      sessionInfoRef.current = null;
    } catch (err) {
      logger.error("app/(tabs)/record.tsx - stopRecording() - Failed to stop recording: ", err);
      setError("Failed to stop recording: " +
        (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function processIntermediateChunk(isLastChunk: boolean = false) {
    logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - Processing intermediate chunk - isLastChunk: " + isLastChunk);
    if (!recordingRef.current || !sessionInfoRef.current) {
      logger.error("app/(tabs)/record.tsx - processIntermediateChunk() - No audio recording in progress - recording: ", recordingRef.current, " sessionInfo: ", sessionInfoRef.current);
      setError("No audio recording in progress!");
      return;
    }

    try {
      // Stop the current recording and get its URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - Recording of Chunk stopped, file saved at: ", uri);

      // Capture the current session info for this chunk
      const currentChunkInfo = { ...sessionInfoRef.current };
      logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - currentChunk SessionInfo: ", currentChunkInfo);

      // Empty the refs to indicate that we're done with this chunk
      recordingRef.current = null;
      sessionInfoRef.current = null;

      if (!isLastChunk) {
        // Immediately start a new recording
        const newRecording = await createNewRecording();
        recordingRef.current = newRecording;
        logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - newRecording: ", newRecording);

        // Update session info for the next chunk
        sessionInfoRef.current = getNextChunkId(currentChunkInfo);
        logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - updated sessionInfoRef.current: ", sessionInfoRef.current);
      }

      // Now, process the current chunk //

      if (!uri) {
        logger.error("app/(tabs)/record.tsx - processIntermediateChunk() - No audio recording available!");
        setError("No audio recording available!");
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - fileInfo: ", fileInfo);
      if (!fileInfo.exists) {
        logger.error("app/(tabs)/record.tsx - processIntermediateChunk() - Recording file does not exist!");
        setError("Recording file does not exist");
        return;
      }

      const audioData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - audioData: ", audioData.substring(0, 100), " ...");

      const auth = getAuth();
      const user = auth.currentUser;
      logger.debug("app/(tabs)/record.tsx - processIntermediateChunk() - User.Email: ", user?.email, " User.Id: ", user?.uid);

      if (!user) {
        logger.error("app/(tabs)/record.tsx - processIntermediateChunk() - User not authenticated");
        setError("User not authenticated");
        return;
      }

      // Send the audio data to our backend server using the processAudio function
      const result = await processAudio({
        audio: audioData,
        userId: user.uid,
        sessionId: currentChunkInfo.sessionId,
        chunkId: currentChunkInfo.chunkId,
        isLastChunk,
      });

      // ToDo - Have a retry functionality

      logger.info("app/(tabs)/record.tsx - processIntermediateChunk() - Audio processing result: ", result);
      
      // Show popup when processing is complete for the last chunk
      if (isLastChunk && result?.conversation_title) {
        Alert.alert(
          "Processing Complete",
          `Your recording "${result.conversation_title}"\nis ready!\n\nCheck the History tab to view the transcript.`,
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      logger.error("app/(tabs)/record.tsx - processIntermediateChunk() - Failed to process audio chunk: ", err);
      setError("Failed to process audio chunk: " +
        (err instanceof Error ? err.message : String(err))
      );
    }
  }

  function scheduleChunkProcessing() {
    logger.debug("app/(tabs)/record.tsx - scheduleChunkProcessing() - Scheduling chunk processing");
    timeoutRefProcessChunk.current = setTimeout(async () => {
      await processIntermediateChunk();
      scheduleChunkProcessing();
    }, AppConfigs.audio.chunkProcessingIntervalMs);
  }

  // Helper functions below //

  async function requestPermissions() {
    logger.debug("app/(tabs)/record.tsx - requestPermissions() - Requesting permissions");
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== "granted") {
      setError("Permission to access microphone was denied");
      return false;
    }
    return true;
  }

  // Configure the audio mode for recording
  async function configureAudio() {
    logger.debug("app/(tabs)/record.tsx - configureAudio() - Configuring audio");
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true, // Not needed since we're only recording, not playing back
      staysActiveInBackground: true, // Keep recording even if app is not in the foreground
      shouldDuckAndroid: true, // Duck other audio on Android while recording
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // Duck other audio
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers, // Allow mixing audio on iOS
    });
  }

  async function createNewRecording() {
    logger.debug("app/(tabs)/record.tsx - createNewRecording() - Creating new recording");
    const newRecording = new Audio.Recording();
    await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await newRecording.startAsync();
    return newRecording;
  }

  // Reset the audio mode to a default or playback-friendly mode
  async function resetAudioMode() {
    logger.debug("app/(tabs)/record.tsx - resetAudioMode() - Resetting audio mode");
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false, // No longer need to allow recording
      playsInSilentModeIOS: false, // Revert to normal silent mode behavior
      staysActiveInBackground: false, // Don't need background audio anymore
      shouldDuckAndroid: false, // Stop ducking other audio
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix, // Use default mixing behavior
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers, // Allow mixing audio on iOS
    });
  }

  function startDurationTimer() {
    logger.debug("app/(tabs)/record.tsx - startDurationTimer() - Starting duration timer");
    intervalRefTotalAudioDuration.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }

  function clearIntervals() {
    logger.debug("app/(tabs)/record.tsx - clearIntervals() - Clearing intervals");
    if (intervalRefTotalAudioDuration.current) {
      clearInterval(intervalRefTotalAudioDuration.current);
      intervalRefTotalAudioDuration.current = null;
    }
    if (timeoutRefProcessChunk.current) {
      clearTimeout(timeoutRefProcessChunk.current);
      timeoutRefProcessChunk.current = null;
    }
  }

  function formatDuration(seconds: number): string {
    // logger.debug("app/(tabs)/record.tsx - formatDuration() - Formatting duration - seconds: " + seconds);
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>
        {isRecording ? "Recording in progress..." : "Please start recording"}
      </ThemedText>
      {isRecording && (
        <ThemedText style={styles.duration}>
          Duration: {formatDuration(duration)}
        </ThemedText>
      )}
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={isRecording ? stopRecording : startRecording}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  duration: {
    fontSize: 18,
    marginBottom: 20,
  },
  error: {
    color: "red",
    marginTop: 20,
    textAlign: "center",
  },
});
