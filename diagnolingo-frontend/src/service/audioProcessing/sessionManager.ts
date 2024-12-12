import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface SessionInfo {
  sessionId: string;
  chunkId: number;
}

export function createNewSession(): SessionInfo {
  return {
    sessionId: uuidv4(),
    chunkId: 0,
  };
}

export function getNextChunkId(sessionInfo: SessionInfo): SessionInfo {
  return {
    ...sessionInfo,
    chunkId: sessionInfo.chunkId + 1,
  };
}
