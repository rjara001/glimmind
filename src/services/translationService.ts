import { auth } from '../firebase';
import { callFunction } from './callFunction';
import { TranslationResponse, TranslationCard } from '../types/translation';

export const translationService = {
  async translateBatch(userId: string, cards: TranslationCard[], targetLang = 'es', sourceLang = 'en'): Promise<TranslationResponse> {
    if (!userId) {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      userId = currentUser.uid;
    }

    return callFunction<TranslationResponse>('translateVocabulary', {
      userId,
      cards,
      targetLang,
      sourceLang,
    });
  },
};
