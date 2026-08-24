import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from '../firebase';
import { VoiceRecording } from '../types/voice-recording';

const COLLECTION = 'voiceRecordings';
const PAGE_SIZE = 50;

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') return value;
  return Date.now();
}

function recordingFromDoc(id: string, data: Record<string, unknown>): VoiceRecording {
  return {
    id,
    userId: data.userId as string,
    listId: data.listId as string,
    audioBase64: data.audioBase64 as string,
    mimeType: data.mimeType as string,
    transcript: data.transcript as string,
    sttProvider: data.sttProvider as string,
    languageCode: (data.languageCode as string) || undefined,
    durationSeconds: data.durationSeconds as number,
    createdAt: toMillis(data.createdAt),
  };
}

export const voiceRecordingService = {
  async getRecordings(userId: string, listId: string): Promise<VoiceRecording[]> {
    if (!userId || !listId) return [];
    console.log('[VoiceRecording] getRecordings userId=', userId, 'listId=', listId);
    const qRef = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('listId', '==', listId),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    );
    const snapshot = await getDocs(qRef);
    console.log('[VoiceRecording] getRecordings count=', snapshot.docs.length);
    return snapshot.docs.map((d) => recordingFromDoc(d.id, d.data()));
  },

  async addRecording(recording: Omit<VoiceRecording, 'id'>): Promise<string> {
    const { createdAt: _createdAt, ...payload } = recording as Record<string, unknown>;
    (payload as Record<string, unknown>)['createdAt'] = serverTimestamp();
    console.log('[VoiceRecording] addRecording payload keys=', Object.keys(payload));
    const ref = await addDoc(collection(db, COLLECTION), payload);
    console.log('[VoiceRecording] addRecording id=', ref.id);
    return ref.id;
  },

  async deleteRecording(userId: string, recordingId: string): Promise<void> {
    if (!userId || !recordingId) return;
    console.log('[VoiceRecording] deleteRecording userId=', userId, 'recordingId=', recordingId);
    await deleteDoc(doc(db, COLLECTION, recordingId));
  },
};
