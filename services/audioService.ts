import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface AudioUploadMetadata {
  userId: string;
  listId: string;
  associationId: string;
  sessionId: string;
  term: string;
  transcript: string;
  correct: boolean;
  timestamp: number;
}

export function buildAudioPath(metadata: AudioUploadMetadata): string {
  const safeTerm = metadata.term.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'term';
  const safeTranscript = metadata.transcript.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'transcript';
  const matchFolder = metadata.correct ? 'match' : 'no-match';
  const date = new Date(metadata.timestamp);
  const datePrefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const timePrefix = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  return `audio/${matchFolder}/${metadata.userId}/${metadata.listId}/${metadata.associationId}/${datePrefix}_${timePrefix}_${safeTerm}_${safeTranscript}.webm`;
}

export async function uploadAudioRecording(blob: Blob, metadata: AudioUploadMetadata): Promise<string> {
  const path = buildAudioPath(metadata);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'audio/webm' });
  return getDownloadURL(storageRef);
}
