import { logger, consoleTransport, fileAsyncTransport } from "react-native-logs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system';

const config = {
  enabled: true, // Enable or disable logging
  transport: [consoleTransport, fileAsyncTransport],
  transportOptions: {
    colors: {
      debug: "white",
      info: "blueBright",
      warn: "yellowBright",
      error: "redBright",
    },
    FS: FileSystem,
    fileName: `log_{date-today}`,
    async: {
      storageBackend: AsyncStorage,
    }, // ToDo: Check if this is needed
    fileNameDateType: "iso",
    maxFiles: 7, // ToDo: Check if this works
  },
  severity: __DEV__ ? "debug" : "info",
  dateFormat: "iso",
  printLevel: true,
  printDate: __DEV__ ? false : true,
  fixedExtLvlLength: true, // Ensure consistent character count alignment when printing extensions and levels
};

const log = logger.createLogger(config);

export default log;
