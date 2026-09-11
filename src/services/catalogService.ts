import { callFunction } from './callFunction';
import type {
  ModerationResult,
  PublishDeckRequest,
  PublishDeckResponse,
} from '../types/catalog';

export const catalogService = {
  submitDeck: async (req: PublishDeckRequest): Promise<PublishDeckResponse> => {
    return await callFunction<PublishDeckResponse>('submitDeckToCatalog', req);
  },

  moderatePreview: async (listId: string): Promise<ModerationResult> => {
    const result = await callFunction<{ ok: boolean; moderation: ModerationResult }>(
      'moderateDeckPreview',
      { listId },
    );
    return result.moderation;
  },
};
